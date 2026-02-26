import os
import json
from dotenv import load_dotenv
from ..memory.artifact_store import ArtifactStore
from ..core.llm_client import call_llm_with_retry

load_dotenv()

class PlannerAgent:
    async def create_plan(self, user_prompt: str) -> dict:
        store = ArtifactStore()
        similar = store.get_similar_plans(user_prompt)
        prefs = store.get_all_preferences()
        store.close()

        context = f"Similar past plans: {similar}" if similar else ""
        if prefs:
            pref_str = ", ".join([f"{k}={v}" for k, v in prefs.items()])
            context += f"\nUser preferences: {pref_str}"

        system_prompt = """You are an expert software planner. Create a step-by-step plan to build the requested app."""
        user_content = f"""{context}

User request: {user_prompt}

Output valid JSON with:
- goal: string
- steps: list of objects with "agent" (e.g., "coder"), "file", "description"
- verification_tests: list of strings describing what to test

Example:
{{
  "goal": "todo app with local storage",
  "steps": [
    {{"agent": "coder", "file": "index.html", "description": "HTML structure"}},
    {{"agent": "coder", "file": "style.css", "description": "Styling"}},
    {{"agent": "coder", "file": "app.js", "description": "Local storage logic"}}
  ],
  "verification_tests": [
    "Input field exists",
    "Add button adds a todo",
    "Todos persist after page refresh"
  ]
}}"""

        text = await call_llm_with_retry(prompt=user_content, system_prompt=system_prompt)

        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()
        return json.loads(text)
