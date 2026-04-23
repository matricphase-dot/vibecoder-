# backend/src/model_router.py
import os, httpx, asyncio, json
from typing import AsyncGenerator, Optional, Dict, Any
import ollama

class ModelRouter:
    def __init__(self):
        self.default_provider = os.getenv("DEFAULT_PROVIDER", "ollama")
        self.deepseek_key = os.getenv("DEEPSEEK_API_KEY", "")
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")

    async def generate(self, prompt: str, system: str = "", provider: Optional[str] = None,
                       model: Optional[str] = None, stream: bool = True) -> AsyncGenerator[str, None]:
        provider = provider or self.default_provider
        if provider == "ollama":
            async for chunk in self._ollama(prompt, system, model or "codellama"):
                yield chunk
        elif provider == "deepseek":
            async for chunk in self._deepseek(prompt, system):
                yield chunk
        elif provider == "openai":
            async for chunk in self._openai(prompt, system):
                yield chunk
        elif provider == "anthropic":
            async for chunk in self._anthropic(prompt, system):
                yield chunk
        else:
            yield f"Unknown provider: {provider}"

    async def _ollama(self, prompt, system, model):
        response = ollama.generate(model=model, prompt=prompt, system=system, stream=True)
        for chunk in response:
            yield chunk['response']

    async def _deepseek(self, prompt, system):
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", "https://api.deepseek.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.deepseek_key}", "Content-Type": "application/json"},
                json={"model":"deepseek-chat","messages":[{"role":"system","content":system},{"role":"user","content":prompt}],"stream":True}) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data != "[DONE]":
                            try:
                                chunk = json.loads(data)
                                if delta := chunk["choices"][0]["delta"].get("content"):
                                    yield delta
                            except: pass

    async def _openai(self, prompt, system):
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.openai_key}"},
                json={"model":"gpt-4","messages":[{"role":"system","content":system},{"role":"user","content":prompt}],"stream":True}) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data != "[DONE]":
                            try:
                                chunk = json.loads(data)
                                if delta := chunk["choices"][0]["delta"].get("content"):
                                    yield delta
                            except: pass

    async def _anthropic(self, prompt, system):
        # simplified – similar pattern
        yield "(Anthropic implementation would go here)"
