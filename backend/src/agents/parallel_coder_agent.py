# backend/src/agents/parallel_coder_agent.py
import asyncio
import json
import ollama
from typing import Dict, List
from src.schemas.file_plan import FilePlan, FilePlanEntry

class ParallelCoderAgent:
    def __init__(self, model="codellama", max_concurrent=3):
        self.model = model
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def code_file(self, entry: FilePlanEntry, all_entries: List[FilePlanEntry], websocket) -> Dict[str, str]:
        async with self.semaphore:
            # Build context from imports
            context = ""
            for imp in entry.imports:
                imported = next((e for e in all_entries if e.path == imp), None)
                if imported and imported.exports:
                    context += f"\nFrom {imp} you can use:\n"
                    for exp in imported.exports:
                        context += f"  {exp.signature}  # {exp.description}\n"
            system = f"Write complete code for {entry.path}. Purpose: {entry.purpose}\nExports needed: {[e.name for e in entry.exports]}\nContext:\n{context}\nOnly output code, no explanations."
            response = ollama.generate(model=self.model, prompt=entry.purpose, system=system)
            content = response.get('response', '')
            # Stream file to frontend immediately
            await websocket.send_text(json.dumps({
                "type": "file", "path": entry.path, "content": content,
                "stage": "coding", "done": 0, "total": len(all_entries)
            }))
            return {entry.path: content}

    async def generate_all(self, plan: FilePlan, websocket) -> Dict[str, str]:
        tasks = [self.code_file(entry, plan.files, websocket) for entry in plan.files]
        results = await asyncio.gather(*tasks)
        final = {}
        for r in results:
            final.update(r)
        return final
