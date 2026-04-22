import ollama
import json

class Planner:
    def __init__(self, model="codellama"):
        self.model = model
    
    async def generate_plans(self, requirements: dict) -> list:
        system = """You are a project planner. Given requirements, output a JSON array of plans.
Each plan: {"name": "Plan name", "description": "what it does", "estimated_time": "X min", "tasks": ["file1", "file2"]}
Output only valid JSON array."""
        
        prompt = f"Requirements: {json.dumps(requirements)}\nGenerate 2 implementation plans."
        response = ollama.generate(model=self.model, prompt=prompt, system=system)
        try:
            plans = json.loads(response['response'])
            if isinstance(plans, dict) and "plans" in plans:
                return plans["plans"]
            return plans if isinstance(plans, list) else []
        except:
            return [
                {"name": "Simple", "description": "Basic working version", "estimated_time": "5 min", "tasks": ["index.html", "style.css", "script.js"]},
                {"name": "Advanced", "description": "With extra features", "estimated_time": "10 min", "tasks": ["index.html", "style.css", "script.js", "utils.js"]}
            ]
