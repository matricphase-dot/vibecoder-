import os
import asyncio
import hashlib
import json
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Explicitly load .env from project root
env_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env')
load_dotenv(dotenv_path=env_path)

# Simple in-memory cache
_cache: Dict[str, Any] = {}

def _get_cache_key(model: str, prompt: str) -> str:
    return hashlib.md5(f"{model}:{prompt}".encode()).hexdigest()

async def call_llm_with_retry(prompt: str, system_prompt: Optional[str] = None, max_retries=3, base_delay=1) -> str:
    """
    Unified LLM caller with retry and cache.
    Supports both Gemini and Groq based on AI_PROVIDER env var.
    """
    provider = os.getenv("AI_PROVIDER", "groq").lower()
    model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile" if provider == "groq" else "models/gemini-2.0-flash")

    # Combine system and user prompt
    full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
    cache_key = _get_cache_key(f"{provider}:{model}", full_prompt)

    # Return cached response if available
    if cache_key in _cache:
        print(f"? Cache hit for {provider} call")
        return _cache[cache_key]

    if provider == "gemini":
        from google import genai
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set in environment")
        client = genai.Client(api_key=api_key)
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=full_prompt
                )
                result = response.text
                _cache[cache_key] = result
                return result
            except Exception as e:
                if "429" in str(e) and attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"?? Gemini quota exceeded, retrying in {delay}s...")
                    await asyncio.sleep(delay)
                else:
                    raise
        raise Exception(f"Gemini max retries ({max_retries}) exceeded")

    elif provider == "groq":
        from groq import AsyncGroq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set in environment")
        client = AsyncGroq(api_key=api_key)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        for attempt in range(max_retries):
            try:
                response = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=4096
                )
                result = response.choices[0].message.content
                _cache[cache_key] = result
                return result
            except Exception as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"?? Groq error, retrying in {delay}s... ({e})")
                    await asyncio.sleep(delay)
                else:
                    raise
        raise Exception(f"Groq max retries ({max_retries}) exceeded")

    else:
        raise ValueError(f"Unknown AI_PROVIDER: {provider}")
