import asyncio
import json
import ollama
import websockets

# ========== Multi-Agent System ==========
class Architect:
    def __init__(self, model="codellama"):
        self.model = model
    
    async def analyze(self, prompt):
        system = """You are a software architect. Output a JSON object with:
        {"summary": "brief", "tech_stack": ["html","css","js"], "files": ["index.html","style.css","script.js"]}
        Only output valid JSON."""
        response = ollama.generate(model=self.model, prompt=prompt, system=system)
        return json.loads(response['response'])

class Planner:
    def __init__(self, model="codellama"):
        self.model = model
    
    async def plan(self, architecture, prompt):
        return architecture.get("files", ["index.html", "style.css", "script.js"])

class Coder:
    def __init__(self, model="codellama"):
        self.model = model
    
    async def write_file(self, path, description, context=""):
        ext = path.split('.')[-1]
        lang_map = {'html': 'html', 'css': 'css', 'js': 'javascript', 'py': 'python'}
        lang = lang_map.get(ext, 'text')
        system = f"Write complete {path} code. Only output the code, no explanations."
        response = ollama.generate(model=self.model, prompt=f"Write {path} for: {description}", system=system)
        return response['response']

# ========== WebSocket Handler (single argument) ==========
async def generation_pipeline(websocket, prompt):
    try:
        arch = Architect()
        planner = Planner()
        coder = Coder()
        
        await websocket.send(json.dumps({"type": "log", "message": "🧠 Architect analyzing requirements..."}))
        architecture = await arch.analyze(prompt)
        await websocket.send(json.dumps({"type": "log", "message": f"📐 Architecture: {architecture.get('summary', 'done')}"}))
        
        await websocket.send(json.dumps({"type": "log", "message": "📋 Planning files..."}))
        files_to_create = await planner.plan(architecture, prompt)
        await websocket.send(json.dumps({"type": "log", "message": f"📝 Will create {len(files_to_create)} files"}))
        
        for filepath in files_to_create:
            await websocket.send(json.dumps({"type": "log", "message": f"✍️ Generating {filepath}..."}))
            content = await coder.write_file(filepath, architecture.get("summary", ""))
            await websocket.send(json.dumps({"type": "file", "path": filepath, "content": content}))
            await asyncio.sleep(0.3)
        
        if "index.html" in files_to_create:
            await websocket.send(json.dumps({"type": "preview", "html": "<h1>Preview ready</h1>"}))
        
        await websocket.send(json.dumps({"type": "complete"}))
    except Exception as e:
        await websocket.send(json.dumps({"type": "error", "message": str(e)}))

# FIXED: handler now takes only one argument (websocket)
async def handler(websocket):
    print("✅ Frontend connected")
    try:
        async for message in websocket:
            data = json.loads(message)
            if data.get("type") == "generate":
                prompt = data.get("prompt", "")
                print(f"🎯 Generating: {prompt}")
                await generation_pipeline(websocket, prompt)
            elif data.get("type") == "stop":
                print("⏹️ Generation stopped")
            else:
                await websocket.send(json.dumps({"type": "log", "message": "Unknown command"}))
    except websockets.exceptions.ConnectionClosed:
        print("❌ Frontend disconnected")
    except Exception as e:
        print(f"Error: {e}")

async def main():
    async with websockets.serve(handler, "127.0.0.1", 8000):
        print("🚀 VibeCoder FULL AI Backend running on ws://127.0.0.1:8000")
        print("✅ Multi-agent system ready (Architect → Planner → Coder)")
        print("🤖 Using Ollama model: codellama")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
