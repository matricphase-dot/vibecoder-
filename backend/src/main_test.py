import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="VibeCoder Test")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("✅ WebSocket connected")
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "generate":
                await websocket.send_text(json.dumps({"type": "log", "message": "Test generation received"}))
                await websocket.send_text(json.dumps({"type": "file", "path": "test.txt", "content": "Hello from test backend"}))
                await websocket.send_text(json.dumps({"type": "complete"}))
            else:
                await websocket.send_text(json.dumps({"type": "log", "message": f"Echo: {data}"}))
    except WebSocketDisconnect:
        print("WebSocket disconnected")

@app.get("/api/health")
async def health():
    return {"status": "ok", "mode": "test"}
