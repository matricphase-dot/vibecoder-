# backend/src/mcp/host.py
import asyncio, subprocess, json, logging, uuid
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class MCPServer:
    name: str
    command: List[str]
    process: Optional[asyncio.subprocess.Process] = None
    tools: List[Dict] = field(default_factory=list)
    capabilities: Dict = field(default_factory=dict)

class MCPHost:
    def __init__(self):
        self.servers: Dict[str, MCPServer] = {}
        self._next_id = 1

    async def register_server(self, name: str, command: List[str]) -> str:
        server_id = f"mcp_{self._next_id}"; self._next_id += 1
        server = MCPServer(name=name, command=command)
        self.servers[server_id] = server
        await self._start_server(server_id)
        return server_id

    async def _start_server(self, server_id: str):
        server = self.servers[server_id]
        try:
            server.process = await asyncio.create_subprocess_exec(
                *server.command, stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            init = {"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{}},"id":1}
            await self._send_request(server_id, init)
            resp = await self._read_response(server_id)
            if "result" in resp:
                server.capabilities = resp["result"].get("capabilities", {})
                tools_req = {"jsonrpc":"2.0","method":"tools/list","id":2}
                tools_resp = await self._send_request(server_id, tools_req)
                server.tools = tools_resp.get("result",{}).get("tools",[])
            logger.info(f"MCP {server.name} started with {len(server.tools)} tools")
        except Exception as e:
            logger.error(f"Failed to start {server.name}: {e}")

    async def call_tool(self, server_id: str, tool_name: str, arguments: Dict) -> Any:
        req = {"jsonrpc":"2.0","method":"tools/call","params":{"name":tool_name,"arguments":arguments},"id":3}
        resp = await self._send_request(server_id, req)
        return resp.get("result",{}).get("content",[])

    async def _send_request(self, server_id: str, req: Dict) -> Dict:
        server = self.servers[server_id]
        msg = json.dumps(req) + "\n"
        server.process.stdin.write(msg.encode())
        await server.process.stdin.drain()
        return await self._read_response(server_id)

    async def _read_response(self, server_id: str) -> Dict:
        line = await self.servers[server_id].process.stdout.readline()
        return json.loads(line.decode())

    async def stop_server(self, server_id: str):
        if server_id in self.servers and self.servers[server_id].process:
            self.servers[server_id].process.terminate()
