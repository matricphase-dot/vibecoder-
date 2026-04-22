# src/generation.py – Multi‑agent with memory
import asyncio
import json
import ollama
from src.memory import VibeMemory
from typing import AsyncGenerator, Dict, Any

class Architect:
    def __init__(self, model="codellama"):
        self.model = model
    async def analyze(self, prompt: str, similar_code=None) -> dict:
        context = ""
        if similar_code:
            context = f"Similar past code:\n{similar_code}\n"
        system = "You are a software architect. Output ONLY JSON: {\"summary\":\"...\",\"tech_stack\":[],\"files\":[]}"
        response = ollama.generate(model=self.model, prompt=context + prompt, system=system)
        return json.loads(response['response'])

class Planner:
    async def plan(self, architecture: dict, prompt: str) -> list:
        return architecture.get("files", ["index.html", "style.css", "script.js"])

class Coder:
    def __init__(self, model="codellama"):
        self.model = model
    async def write_file(self, path: str, description: str) -> str:
        lang_map = {'html':'html','css':'css','js':'javascript','py':'python'}
        lang = lang_map.get(path.split('.')[-1], 'text')
        system = f"Write complete {path} code. Output ONLY the code."
        response = ollama.generate(model=self.model, prompt=f"Write {path} for: {description}", system=system)
        return response['response']

class GenerationOrchestrator:
    def __init__(self):
        self.architect = Architect()
        self.planner = Planner()
        self.coder = Coder()
        self.memory = VibeMemory()
    
    async def generate(self, prompt: str, plan_type: str, template: str) -> AsyncGenerator[Dict[str, Any], None]:
        similar = self.memory.search_similar(prompt, n_results=2)
        if similar and any(similar):
            yield {"type": "log", "message": "📚 Found similar past code – using memory"}
        else:
            yield {"type": "log", "message": "🧠 Architect analyzing requirements..."}
        
        arch = await self.architect.analyze(prompt, similar[0] if similar and similar[0] else None)
        yield {"type": "log", "message": f"📐 Architecture: {arch.get('summary','')}"}
        
        files = await self.planner.plan(arch, prompt)
        yield {"type": "log", "message": f"📝 Will create {len(files)} files"}
        
        for path in files:
            yield {"type": "log", "message": f"✍️ Generating {path}..."}
            content = await self.coder.write_file(path, arch.get("summary",""))
            self.memory.store_code(prompt, path, content)
            yield {"type": "file", "path": path, "content": content}
            await asyncio.sleep(0.2)
        
        yield {"type": "complete"}
