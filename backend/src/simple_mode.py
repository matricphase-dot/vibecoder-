# backend/src/simple_mode.py
import json
import ollama
from typing import Dict, Any

class SimpleModeSummarizer:
    def __init__(self, model="codellama"):
        self.model = model

    async def summarize_result(self, files: Dict[str, str], prompt: str) -> str:
        system = "You are a friendly assistant explaining technical results to a non-technical user. Describe what was built in simple, plain English. Do not mention file names, code, or technical terms. Focus on features and outcomes."
        user_prompt = f"User asked: {prompt}\n\nThe system generated these files: {list(files.keys())}\n\nExplain what was built in one short paragraph for someone who has never coded."
        response = ollama.generate(model=self.model, prompt=user_prompt, system=system)
        return response['response'].strip()

    async def suggest_next(self, prompt: str, summary: str) -> str:
        system = "You are a helpful assistant. Based on what was built, suggest 2-3 next steps the user could take. Keep it simple and non-technical."
        user_prompt = f"User asked: {prompt}\nWhat was built: {summary}\nSuggest next steps:"
        response = ollama.generate(model=self.model, prompt=user_prompt, system=system)
        return response['response'].strip()
