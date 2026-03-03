import os
import json
from dotenv import load_dotenv
from ..memory.artifact_store import ArtifactStore
from ..core.llm_client import call_llm_with_retry

load_dotenv()

class PlannerAgent:
    async def create_plan(self, user_prompt: str, backend_lang: str = "none") -> dict:
        store = ArtifactStore()
        similar = store.get_similar_plans(user_prompt)
        prefs = store.get_all_preferences()
        store.close()

        context = f"Similar past plans: {similar}" if similar else ""
        if prefs:
            pref_str = ", ".join([f"{k}={v}" for k, v in prefs.items()])
            context += f"\nUser preferences: {pref_str}"

        system_prompt = """You are an expert software architect. Create a detailed plan for building the requested application, including both frontend and backend (if requested)."""
        user_content = f"""{context}

User request: {user_prompt}
Backend language: {backend_lang}

If backend_lang is "node", generate Node.js/Express backend with necessary files (server.js, package.json, routes, etc.). If "python", generate Python/FastAPI backend with app.py, requirements.txt, etc. If "none", generate only frontend.

Output valid JSON with:
- goal: string
- steps: list of objects with "agent" (e.g., "coder"), "file", "description"
- verification_tests: list of strings
- files: dictionary where keys are filenames and values are brief descriptions (actual code will be generated later)

Example:
{{
  "goal": "todo app with backend",
  "steps": [
    {{"agent": "coder", "file": "index.html", "description": "HTML structure"}},
    {{"agent": "coder", "file": "style.css", "description": "Styling"}},
    {{"agent": "coder", "file": "app.js", "description": "Frontend logic"}},
    {{"agent": "coder", "file": "server.js", "description": "Express server"}},
    {{"agent": "coder", "file": "package.json", "description": "Node dependencies"}}
  ],
  "verification_tests": [
    "Input field exists",
    "Add button adds a todo",
    "API responds at /api/todos"
  ]
}}
"""
        text = await call_llm_with_retry(prompt=user_content, system_prompt=system_prompt)

        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()
        return json.loads(text)
