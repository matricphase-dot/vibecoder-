import asyncio
from src.core.llm_client import LLMClient
class ArchitectAgent:
    def __init__(self, llm_client): self.llm = llm_client
    async def run(self, prompt): return {"frontend_framework": "React", "backend_framework": "Node.js"}
class PlannerAgent:
    def __init__(self, llm_client): self.llm = llm_client
    async def run(self, prompt, architecture=None): return {"files": ["index.html"], "description": "plan", "steps": ["step1"]}
class CoderAgent:
    def __init__(self, llm_client): self.llm = llm_client
    async def run(self, plan, prompt): return [{"path": "index.html", "content": "<h1>Hello</h1>"}]
class DebuggerAgent:
    def __init__(self, llm_client): self.llm = llm_client
    async def run(self, content, error, file_path): return content
class ReviewerAgent:
    def __init__(self, llm_client): self.llm = llm_client
    async def run(self, files, prompt, plan): return []
class TesterAgent:
    def __init__(self, llm_client): self.llm = llm_client
    async def generate_tests(self, files): return []
class SecurityAgent:
    def __init__(self, llm_client): self.llm = llm_client
    async def audit(self, files): return []
class OptimizerAgent:
    def __init__(self, llm_client): self.llm = llm_client
    async def optimize(self, files): return []
    async def _optimize_file(self, file): return file["content"]
class DeployerAgent:
    def __init__(self, llm_client): self.llm = llm_client
    async def run(self, files, plan): return []
