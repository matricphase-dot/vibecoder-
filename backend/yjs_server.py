# yjs_server.py – WebSocket server for Yjs collaboration
import asyncio
import websockets
import json
from ypy import YDoc
from ypy.websocket import WebsocketProvider

docs = {}

async def handler(websocket, path):
    doc_id = path.strip('/') or "default"
    if doc_id not in docs:
        docs[doc_id] = YDoc()
    ydoc = docs[doc_id]
    provider = WebsocketProvider(ydoc, websocket)
    try:
        await provider.run()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        provider.close()

async def main():
    async with websockets.serve(handler, "127.0.0.1", 1234):
        print("🚀 Yjs collaboration server running on ws://127.0.0.1:1234")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
