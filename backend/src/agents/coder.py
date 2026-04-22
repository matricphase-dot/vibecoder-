import ollama
import asyncio
import json

class Coder:
    def __init__(self, model="codellama"):
        self.model = model
    
    async def generate(self, plan: dict, requirements: dict, memory, websocket):
        files = {}
        for task in plan.get("tasks", []):
            await websocket.send_text(json.dumps({"type": "log", "message": f"✍️ Coding {task}..."}))
            
            # Determine language from file extension
            ext = task.split('.')[-1] if '.' in task else 'txt'
            lang_map = {'js': 'javascript', 'html': 'html', 'css': 'css', 'py': 'python'}
            lang = lang_map.get(ext, 'text')
            
            system = f"""You are an expert developer. Write complete, production-ready code for {task}.
Language: {lang}
Requirements: {json.dumps(requirements)}
Plan: {plan.get('description')}
Only output the file content, no explanations or markdown."""
            
            response = ollama.generate(model=self.model, prompt=f"Write {task}", system=system)
            content = response['response'].strip()
            
            files[task] = content
            await websocket.send_text(json.dumps({"type": "file", "path": task, "content": content}))
            await asyncio.sleep(0.3)
        return files
