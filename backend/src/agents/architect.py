import ollama
import json

class Architect:
    def __init__(self, model="codellama"):
        self.model = model
    
    async def analyze(self, prompt: str) -> dict:
        system = """You are a software architect. Analyze the user request and output a JSON object with:
{
  "summary": "brief description",
  "tech_stack": ["html","css","javascript"],
  "files_needed": ["index.html","style.css","script.js"],
  "structure": "explanation"
}
Only output valid JSON."""
        
        response = ollama.generate(model=self.model, prompt=prompt, system=system)
        try:
            return json.loads(response['response'])
        except:
            return {
                "summary": f"Build: {prompt[:50]}",
                "tech_stack": ["html","css","javascript"],
                "files_needed": ["index.html","style.css","script.js"],
                "structure": "simple static site"
            }
