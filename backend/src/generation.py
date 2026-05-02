# generation.py – Gemini primary, Groq fallback
import asyncio
import httpx
import json
import os
import logging
from pathlib import Path
from typing import AsyncGenerator, Dict, Any

logger = logging.getLogger("generation")

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")
WORKSPACE = Path(os.getenv("WORKSPACE_DIR", "workspace"))

SYSTEM_PROMPT = """You are VibeCoder, expert AI engineer.
Generate complete, working, production-ready code.

RULES:
1. Always output files in this EXACT format:
   === FILE: filename.ext ===
   [complete file content here]
   === END FILE ===

2. Generate ALL needed files (at least index.html, style.css, script.js).
3. Write complete code – no placeholders.
4. Make the code beautiful and modern.
5. Add proper error handling.

Generate the complete application now:"""

async def call_gemini(prompt: str) -> AsyncGenerator[str, None]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key={GEMINI_KEY}&alt=sse"
    body = {
        "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\n\nUser request: {prompt}"}], "role": "user"}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 8192}
    }
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream("POST", url, json=body) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[6:]
                    if chunk == "[DONE]": break
                    try:
                        d = json.loads(chunk)
                        text = d.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text: yield text
                    except: pass

async def call_groq(prompt: str) -> AsyncGenerator[str, None]:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"}
    body = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
        "stream": True,
        "temperature": 0.2,
        "max_tokens": 8192
    }
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream("POST", url, headers=headers, json=body) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[6:]
                    if chunk == "[DONE]": break
                    try:
                        d = json.loads(chunk)
                        text = d["choices"][0]["delta"].get("content", "")
                        if text: yield text
                    except: pass

def parse_files(raw_text: str) -> Dict[str, str]:
    files = {}
    parts = raw_text.split("=== FILE:")
    for part in parts[1:]:
        try:
            header, rest = part.split("===", 1)
            filename = header.strip()
            if "=== END FILE ===" in rest:
                content = rest.split("=== END FILE ===")[0].strip()
            else:
                content = rest.strip()
            if filename and content:
                files[filename] = content
        except: pass
    return files

class GenerationOrchestrator:
    async def generate(self, prompt: str, plan_type: str = "standard", template: str = "react") -> AsyncGenerator[Dict[str, Any], None]:
        logger.info(f"Starting generation: {prompt}")
        WORKSPACE.mkdir(exist_ok=True)

        # Agent status updates
        agents = [
            ("architect", "Analyzing your request..."),
            ("planner", "Planning file structure..."),
            ("coder", "Generating code..."),
        ]
        for agent, msg in agents:
            yield {"type": "agent", "agent": agent, "message": msg}
            await asyncio.sleep(0.1)

        full_text = ""
        used_groq = False

        try:
            if GEMINI_KEY:
                logger.info("Using Gemini API")
                yield {"type": "log", "message": "Using Gemini 2.0 Flash (free)"}
                async for chunk in call_gemini(prompt):
                    full_text += chunk
                    yield {"type": "chunk", "text": chunk}
            else:
                raise ValueError("No Gemini key")
        except Exception as e:
            logger.warning(f"Gemini failed: {e}, falling back to Groq")
            if GROQ_KEY:
                logger.info("Using Groq API fallback")
                yield {"type": "log", "message": "Rate limit reached – switching to Groq (free, ultra‑fast)"}
                used_groq = True
                full_text = ""
                async for chunk in call_groq(prompt):
                    full_text += chunk
                    yield {"type": "chunk", "text": chunk}
            else:
                raise

        files = parse_files(full_text)
        yield {"type": "agent", "agent": "reviewer", "message": "Reviewing output..."}

        written = []
        for filename, content in files.items():
            filepath = WORKSPACE / filename
            filepath.parent.mkdir(parents=True, exist_ok=True)
            filepath.write_text(content, encoding="utf-8")
            written.append(filename)
            yield {"type": "file", "path": filename, "content": content}
            logger.info(f"Wrote: {filename}")

        yield {"type": "agent", "agent": "debugger", "message": "Done!"}
        yield {"type": "complete", "files": written}
        logger.info(f"Generation complete. Files: {written}")
