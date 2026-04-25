# backend/src/ast/context_builder.py (stub)
from typing import Dict

class ContextBuilder:
    def __init__(self, workspace_path: str = "./workspace"):
        pass

    def build_agent_context(self, files: Dict[str, str]) -> str:
        return ""

    def inject_into_prompt(self, user_prompt: str, workspace_files: Dict[str, str]) -> str:
        return user_prompt
