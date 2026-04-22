import os
import requests
class LLMClient:
    def __init__(self, model=None):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = model or os.getenv("OLLAMA_MODEL", "tinyllama")
        self.timeout = int(os.getenv("OLLAMA_TIMEOUT", "3600"))
    def generate(self, prompt):
        url = f"{self.base_url}/api/generate"
        payload = {"model": self.model, "prompt": prompt, "stream": False}
        try:
            response = requests.post(url, json=payload, timeout=self.timeout)
            if response.status_code == 200:
                return response.json().get("response", "")
            else:
                return None
        except Exception as e:
            print(f"LLM error: {e}")
            return None
