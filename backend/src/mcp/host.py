import asyncio, os, logging
from dataclasses import dataclass, field
from typing import Any
from .jsonrpc import JsonRpcRequest, JsonRpcResponse, JsonRpcError
logger=logging.getLogger('mcp.host')

@dataclass
class MCPServerConfig:
    name:str; command:str
    args:list[str]=field(default_factory=list)
    env:dict[str,str]=field(default_factory=dict)

@dataclass
class MCPTool:
    name:str; description:str; input_schema:dict; server:str

class MCPProcess:
    def __init__(self,config:MCPServerConfig):
        self.config=config; self.proc=None
        self._req_id=0; self._pending:dict[int,asyncio.Future]={}
        self._reader:asyncio.Task|None=None

    async def start(self)->None:
        env={**os.environ,**self.config.env}
        self.proc=await asyncio.create_subprocess_exec(
            self.config.command,*self.config.args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env
        )
        self._reader=asyncio.create_task(self._read_loop())

    async def _read_loop(self)->None:
        while True:
            try:
                line=await self.proc.stdout.readline()
                if not line: break
                resp=JsonRpcResponse.from_line(line.decode())
                if resp.id in self._pending:
                    fut=self._pending.pop(resp.id)
                    if resp.is_error:
                        fut.set_exception(JsonRpcError(resp.error.get('code',-32000),resp.error.get('message','')))
                    else:
                        fut.set_result(resp.result)
            except Exception as e:
                logger.debug(f'Read loop error: {e}')
                break

    async def call(self,method:str,params:dict|None=None,timeout:float=15.0)->Any:
        if not self.alive: raise RuntimeError(f'MCP server {self.config.name} not running')
        self._req_id+=1
        rid=self._req_id
        fut=asyncio.get_event_loop().create_future()
        self._pending[rid]=fut
        req=JsonRpcRequest(method=method,params=params,id=rid)
        self.proc.stdin.write(req.to_bytes())
        await self.proc.stdin.drain()
        return await asyncio.wait_for(fut,timeout=timeout)

    async def notify(self,method:str,params:dict|None=None)->None:
        if not self.alive: return
        req=JsonRpcRequest(method=method,params=params,id=None)
        self.proc.stdin.write(req.to_bytes())
        await self.proc.stdin.drain()

    async def stop(self)->None:
        if self._reader: self._reader.cancel()
        for fut in self._pending.values():
            if not fut.done(): fut.cancel()
        self._pending.clear()
        if self.proc and self.proc.returncode is None:
            self.proc.terminate()
            try: await asyncio.wait_for(self.proc.wait(),timeout=3)
            except asyncio.TimeoutError: self.proc.kill()

    @property
    def alive(self)->bool:
        return self.proc is not None and self.proc.returncode is None

class MCPHost:
    def __init__(self):
        self._procs:dict[str,MCPProcess]={}
        self._tools:dict[str,list[MCPTool]]={}
        self.logger=logging.getLogger('mcp.host')

    async def register(self,cfg:MCPServerConfig)->None:
        proc=MCPProcess(cfg)
        await proc.start()
        await asyncio.sleep(0.5)  # give process time to initialize
        # MCP initialize handshake
        await proc.call('initialize',{
            'protocolVersion':'2024-11-05',
            'capabilities':{},
            'clientInfo':{'name':'VibeCoder','version':'1.0'}
        })
        await proc.notify('notifications/initialized')
        # Fetch tools
        result=await proc.call('tools/list',{})
        tools=[]
        for t in (result or {}).get('tools',[]):
            tools.append(MCPTool(
                name=t['name'],description=t.get('description',''),
                input_schema=t.get('inputSchema',{}),server=cfg.name
            ))
        self._procs[cfg.name]=proc
        self._tools[cfg.name]=tools
        self.logger.info(f'Registered MCP server {cfg.name!r} with {len(tools)} tools')

    async def call_tool(self,server:str,tool:str,args:dict)->dict:
        proc=self._procs.get(server)
        if not proc or not proc.alive:
            raise RuntimeError(f'MCP server {server!r} not running')
        return await proc.call('tools/call',{'name':tool,'arguments':args})

    async def list_tools(self,server:str|None=None)->list[MCPTool]:
        if server: return self._tools.get(server,[])
        return [t for ts in self._tools.values() for t in ts]

    def tools_for_prompt(self)->str:
        tools=[t for ts in self._tools.values() for t in ts]
        if not tools: return ''
        lines=['\nAvailable MCP tools you can call:']
        for t in tools:
            lines.append(f'  - {t.server}.{t.name}: {t.description}')
        return '\n'.join(lines)

    async def unregister(self,name:str)->None:
        if p:=self._procs.pop(name,None): await p.stop()
        self._tools.pop(name,None)

    def status(self)->list[dict]:
        return [{'name':n,'alive':p.alive,
                 'tools':len(self._tools.get(n,[])),'command':p.config.command}
                for n,p in self._procs.items()]
