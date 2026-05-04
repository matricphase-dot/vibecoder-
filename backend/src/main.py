import asyncio
import logging
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from src.generation import GenerationOrchestrator
from src.system.file_manager import FileManager
from src.system.workspace_manager import WorkspaceManager
from src.mcp_routes import router as mcp_router

app = FastAPI(title="VibeCoder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

file_mgr = FileManager()
ws_mgr = WorkspaceManager()

@app.get("/")
async def root():
    return {"status": "ok"}

# System file access endpoints
@app.post("/system/browse")
async def system_browse(body: dict):
    import dataclasses
    node = file_mgr.browse(body['path'], body.get('max_depth', 3))
    return dataclasses.asdict(node)

@app.post("/system/read")
async def system_read(body: dict):
    return file_mgr.read(body['path'])

@app.post("/system/write")
async def system_write(body: dict):
    return file_mgr.write(body['path'], body['content'], body.get('create_dirs', True))

@app.post("/system/delete")
async def system_delete(body: dict):
    return file_mgr.delete(body['path'])

@app.post("/system/run")
async def system_run(body: dict):
    import dataclasses
    result = await file_mgr.run(body['command'], body.get('cwd'), body.get('timeout', 30.0))
    return dataclasses.asdict(result)

@app.get("/system/drives")
async def system_drives():
    return file_mgr.get_drives()

@app.websocket("/ws/run")
async def ws_run(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            async for evt in file_mgr.run_stream(data['command'], data.get('cwd')):
                await websocket.send_json(evt)
    except WebSocketDisconnect:
        pass

# Workspace endpoints
@app.post("/workspace/open")
async def workspace_open(body: dict):
    import dataclasses
    proj = ws_mgr.open_project(body['path'])
    return dataclasses.asdict(proj)

@app.get("/workspace/list")
async def workspace_list():
    import dataclasses
    return [dataclasses.asdict(p) for p in ws_mgr.list_projects()]

@app.delete("/workspace/{pid}")
async def workspace_remove(pid: str):
    ws_mgr.remove_project(pid)
    return {"ok": True}

# Generation WebSocket
@app.websocket("/ws")
async def generation_websocket(websocket: WebSocket):
    await websocket.accept()
    orch = GenerationOrchestrator()
    try:
        while True:
            data = await websocket.receive_json()
            if data.get('type') == 'generate':
                prompt = data.get('prompt', '')
                async for event in orch.generate(prompt):
                    await websocket.send_json(event)
            else:
                await websocket.send_json({'type': 'error', 'message': f'Unknown type: {data.get("type")}'})
    except WebSocketDisconnect:
        pass

# Include MCP router - MUST be after all other routes to avoid conflicts
app.include_router(mcp_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
