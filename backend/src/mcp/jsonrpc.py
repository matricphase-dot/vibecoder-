import json
from dataclasses import dataclass
from typing import Any

class JsonRpcError(Exception):
    def __init__(self, code: int, message: str, data=None):
        self.code=code; self.message=message; self.data=data
        super().__init__(f'JSON-RPC error {code}: {message}')

@dataclass
class JsonRpcRequest:
    method: str
    params: dict | None = None
    id: int | str | None = None
    jsonrpc: str = '2.0'
    def to_bytes(self) -> bytes:
        d = {'jsonrpc':self.jsonrpc,'method':self.method}
        if self.params is not None: d['params'] = self.params
        if self.id is not None: d['id'] = self.id
        return (json.dumps(d)+'\n').encode('utf-8')

@dataclass
class JsonRpcResponse:
    jsonrpc: str; id: int|str|None; result: Any=None; error: dict|None=None
    @classmethod
    def from_line(cls, line: str) -> 'JsonRpcResponse':
        d=json.loads(line.strip())
        return cls(jsonrpc=d.get('jsonrpc','2.0'),id=d.get('id'),
                   result=d.get('result'),error=d.get('error'))
    @property
    def is_error(self)->bool: return self.error is not None
    def raise_if_error(self)->None:
        if self.is_error:
            raise JsonRpcError(self.error.get('code',-32000),
                               self.error.get('message','RPC error'))
