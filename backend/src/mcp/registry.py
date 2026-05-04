import json
from pathlib import Path
from .host import MCPServerConfig

class MCPRegistry:
    PATH=Path.home()/'.vibecoder'/'mcp_servers.json'
    def __init__(self):
        self._cfgs:dict[str,MCPServerConfig]={}
        self.PATH.parent.mkdir(parents=True,exist_ok=True)
        if self.PATH.exists():
            raw=json.loads(self.PATH.read_text())
            self._cfgs={k:MCPServerConfig(**v) for k,v in raw.items()}
    def save(self)->None:
        data={k:{'name':v.name,'command':v.command,'args':v.args,'env':v.env}
              for k,v in self._cfgs.items()}
        self.PATH.write_text(json.dumps(data,indent=2))
    def add(self,cfg:MCPServerConfig)->None:
        self._cfgs[cfg.name]=cfg; self.save()
    def remove(self,name:str)->None:
        self._cfgs.pop(name,None); self.save()
    def all(self)->list[MCPServerConfig]:
        return list(self._cfgs.values())
