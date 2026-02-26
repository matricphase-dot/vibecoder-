import asyncio
import time
from google.genai import errors
import random

async def call_gemini_with_retry(client, model, prompt, max_retries=5, base_delay=1):
    """
    Call Gemini API with exponential backoff retry on quota errors (429).
    Returns the response object.
    """
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt
            )
            return response
        except errors.ClientError as e:
            # Check if it's a 429 quota error
            if e.code == 429:
                # Try to parse retry delay from error details (if present)
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                print(f"?? Quota exceeded (attempt {attempt+1}/{max_retries}). Retrying in {delay:.2f}s...")
                await asyncio.sleep(delay)
            else:
                # Re-raise other client errors
                raise
        except Exception as e:
            # For other exceptions, you might want to retry or raise
            print(f"Unexpected error: {e}")
            raise
    raise Exception(f"Max retries ({max_retries}) exceeded for Gemini API call.")
