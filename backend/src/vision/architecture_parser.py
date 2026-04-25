# backend/src/vision/architecture_parser.py
import ollama
import json
import base64
from pathlib import Path
from typing import Dict, Any

class ArchitectureParser:
    def __init__(self, model="llava"):
        self.model = model

    async def parse_image(self, image_path: str, image_type: str = "diagram") -> Dict[str, Any]:
        """
        image_type: mockup, erd, architecture, flowchart, whiteboard
        Returns structured spec with components, relationships, tech stack.
        """
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()
        # LLaVA prompt (vision)
        prompt = f"""You are an AI that converts visual design into a structured software specification.
The image shows a {image_type}. Analyze it and output JSON with:
- type: the type of design (mockup, erd, architecture, flowchart, whiteboard)
- components: list of main components/screens/modules
- relationships: list of connections between components
- tech_stack: list of recommended technologies
- description: short summary
Output ONLY valid JSON, no extra text."""
        response = ollama.generate(model=self.model, prompt=prompt, images=[image_data], system="You are a precise JSON generator.")
        try:
            spec = json.loads(response['response'])
            return spec
        except:
            # fallback
            return {"type": image_type, "components": [], "relationships": [], "tech_stack": [], "description": "No details extracted"}

    async def generate_implementation(self, spec: Dict[str, Any]) -> str:
        """Convert spec into a text prompt for the file planner."""
        if spec.get("type") == "erd":
            prompt = f"Generate SQLAlchemy models for entities: {spec.get('components', [])}. Relationships: {spec.get('relationships', [])}. Include migrations and CRUD routes."
        elif spec.get("type") == "architecture":
            prompt = f"Implement a microservice architecture with components: {spec.get('components', [])} and connections: {spec.get('relationships', [])}. Use {spec.get('tech_stack', ['FastAPI'])}."
        elif spec.get("type") == "mockup":
            prompt = f"Create React components for the following UI mockup: {spec.get('description', '')}. Components: {spec.get('components', [])}. Use Tailwind CSS."
        else:
            prompt = f"Generate code from the following design: {spec.get('description', '')}"
        return prompt
