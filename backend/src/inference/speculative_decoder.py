# backend/src/inference/speculative_decoder.py
import asyncio
import json
import httpx
import logging
from typing import AsyncGenerator, List, Optional

logger = logging.getLogger(__name__)

class SpeculativeDecoder:
    def __init__(self, draft_model="tinyllama", target_model="codellama", gamma=5, ollama_url="http://127.0.0.1:11434"):
        self.draft_model = draft_model
        self.target_model = target_model
        self.gamma = gamma  # number of draft tokens to generate before verification
        self.ollama_url = ollama_url

    async def _generate_draft(self, prompt: str, num_tokens: int) -> List[str]:
        """Generate gamma tokens using the draft model."""
        url = f"{self.ollama_url}/api/generate"
        payload = {
            "model": self.draft_model,
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": num_tokens}
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            data = response.json()
            full_response = data.get("response", "")
            # Split into tokens (naive split by space – Ollama doesn't return token list)
            # For simplicity, assume tokens are roughly words; real impl would use tokenizer.
            # We'll treat spaces as delimiters.
            tokens = full_response.split()
            return tokens[:num_tokens]

    async def _verify_tokens(self, prefix: str, draft_tokens: List[str]) -> tuple:
        """Ask the target model to verify the draft tokens in one forward pass."""
        # Build the full sequence: prefix + draft_tokens joined with space
        draft_text = " ".join(draft_tokens)
        full_prompt = prefix + draft_text
        url = f"{self.ollama_url}/api/generate"
        payload = {
            "model": self.target_model,
            "prompt": full_prompt,
            "stream": False,
            "options": {"num_predict": 1}  # we only need the next token(s) to verify
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            data = response.json()
            # The target model's output should start with the next token after prefix.
            # For simplicity, we'll compare the first word of the continuation.
            target_continuation = data.get("response", "").strip()
            # Determine how many of the draft tokens match the target's continuation
            accepted = 0
            for i, t in enumerate(draft_tokens):
                if target_continuation.startswith(t):
                    accepted = i + 1
                    # Remove the accepted part from target_continuation for next iteration?
                    target_continuation = target_continuation[len(t):].lstrip()
                else:
                    break
            # If none accepted, we still need the correct next token (from target)
            correct_next = target_continuation.split()[0] if target_continuation else draft_tokens[0]
            return accepted, correct_next

    async def generate(self, prompt: str, max_tokens: int = 2000) -> AsyncGenerator[str, None]:
        """Stream tokens using speculative decoding."""
        current_prompt = prompt
        total_generated = 0
        acceptance_rate = 0
        total_draft_tokens = 0

        while total_generated < max_tokens:
            # Step 1: Draft model generates gamma tokens
            draft_tokens = await self._generate_draft(current_prompt, self.gamma)
            total_draft_tokens += len(draft_tokens)
            if not draft_tokens:
                break
            # Step 2: Verify with target model
            accepted, correct_next = await self._verify_tokens(current_prompt, draft_tokens)
            # Step 3: Stream accepted tokens
            for i in range(accepted):
                token = draft_tokens[i]
                yield token + " "
                total_generated += 1
                current_prompt += token + " "
            # Step 4: If not all accepted, also output the correct next token from target
            if accepted < len(draft_tokens):
                yield correct_next + " "
                total_generated += 1
                current_prompt += correct_next + " "
            # Update acceptance rate
            if total_draft_tokens > 0:
                acceptance_rate = accepted / total_draft_tokens
            # If no tokens were accepted, break to avoid infinite loop
            if accepted == 0:
                break

        logger.info(f"Speculative decoding finished. Acceptance rate: {acceptance_rate:.2f}")
        return

    async def generate_stream(self, prompt: str, max_tokens: int = 2000):
        """Wrapper to match the async generator interface."""
        async for token in self.generate(prompt, max_tokens):
            yield token
