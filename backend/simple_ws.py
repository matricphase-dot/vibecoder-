import asyncio
import websockets
import json

async def handle_client(websocket):
    print("✅ Frontend connected")
    await websocket.send(json.dumps({"type": "log", "message": "Connected to VibeCoder backend"}))
    try:
        async for message in websocket:
            data = json.loads(message)
            if data.get("type") == "generate":
                prompt = data.get("prompt", "")
                print(f"Generating: {prompt}")
                # Simulate streaming files
                await websocket.send(json.dumps({"type": "log", "message": f"Generating project: {prompt}"}))
                await asyncio.sleep(0.5)
                await websocket.send(json.dumps({"type": "file", "path": "index.html", "content": "<!DOCTYPE html><html><head><title>VibeCoder</title></head><body><h1>Hello from VibeCoder</h1><p>Your AI assistant</p></body></html>"}))
                await websocket.send(json.dumps({"type": "file", "path": "style.css", "content": "body { font-family: sans-serif; background: #0D1117; color: white; } h1 { color: #58A6FF; }"}))
                await websocket.send(json.dumps({"type": "file", "path": "script.js", "content": "console.log('VibeCoder ready');"}))
                await websocket.send(json.dumps({"type": "preview", "html": "<h1>Preview</h1>"}))
                await websocket.send(json.dumps({"type": "complete"}))
            else:
                await websocket.send(json.dumps({"type": "log", "message": f"Unknown command: {data}"}))
    except websockets.exceptions.ConnectionClosed:
        print("❌ Frontend disconnected")

async def main():
    async with websockets.serve(handle_client, "127.0.0.1", 8000):
        print("🚀 WebSocket server running on ws://127.0.0.1:8000")
        print("✅ Ready for frontend connections")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
