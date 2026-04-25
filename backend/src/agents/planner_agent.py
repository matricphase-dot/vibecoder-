# backend/src/agents/planner_agent.py
import json
import ollama
from src.schemas.file_plan import FilePlan, FilePlanEntry

class PlannerAgent:
    def __init__(self, model="codellama"):
        self.model = model

    async def generate_plan(self, prompt: str) -> FilePlan:
        system = """You are a software architect. Given a user prompt, output a JSON file plan.
The plan must contain a 'files' array. Each file has:
- path: relative path (e.g., 'backend/src/models/user.py')
- purpose: short description
- exports: list of {name, signature, description, return_type}
- imports: list of relative paths this file will import
Output ONLY valid JSON, no extra text. Plan for 20-50 files."""
        response = ollama.generate(model=self.model, prompt=prompt, system=system)
        try:
            data = json.loads(response['response'])
            return FilePlan(**data)
        except:
            # fallback minimal plan
            return FilePlan(files=[
                FilePlanEntry(path="index.html", purpose="Main HTML", exports=[], imports=[]),
                FilePlanEntry(path="style.css", purpose="Styles", exports=[], imports=[]),
                FilePlanEntry(path="app.js", purpose="Frontend logic", exports=[], imports=[])
            ])
