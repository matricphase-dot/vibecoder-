# backend/src/prompt_enhancer.py
import ollama

async def enhance_prompt(prompt: str) -> str:
    """Use tinyllama to expand vague prompts into explicit full‑stack requirements."""
    system = """You are a prompt engineer. Expand the following user request into a detailed, explicit full‑stack specification.
Include: user authentication, database, API layer, frontend, and testing. Output only the expanded prompt, no extra text."""
    response = ollama.generate(model="tinyllama", prompt=prompt, system=system)
    expanded = response.get('response', prompt)
    return expanded if len(expanded) > len(prompt) else prompt
