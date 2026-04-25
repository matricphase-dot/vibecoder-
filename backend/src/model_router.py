# backend/src/model_router.py (cloud version)
import os
import httpx
from typing import AsyncGenerator

class ModelRouter:
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.base_url = "https://api.deepseek.com/v1/chat/completions"
    
    async def generate(self, prompt: str, system: str = "", stream: bool = True) -> AsyncGenerator[str, None]:
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        data = {
            "model": "deepseek-coder",
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            "stream": stream,
            "max_tokens": 2000
        }
        async with httpx.AsyncClient() as client:
            if stream:
                async with client.stream("https://api.deepseek.com/v1/chat/completions", headers=headers, json=data) as resp:
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            chunk = line[6:]
                            if chunk != "[DONE]":
                                import json
                                try:
                                    delta = json.loads(chunk)["choices"][0]["delta"].get("content")
                                    if delta:
                                        yield delta
                                except:
                                    pass
            else:
                resp = await client.post("https://api.deepseek.com/v1/chat/completions", headers=headers, json=data)
                yield resp.json()["choices"][0]["message"]["content"]
