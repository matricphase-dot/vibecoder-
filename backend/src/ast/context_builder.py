# backend/src/ast/context_builder.py
import os
from pathlib import Path
from typing import Dict, List
from src.ast.parser import get_ast_parser

class ContextBuilder:
    def __init__(self, workspace_path: str = "./workspace"):
        self.workspace_path = Path(workspace_path)
        self.parser = get_ast_parser()

    def build_agent_context(self, files: Dict[str, str]) -> str:
        """Build structured context from generated files."""
        context_parts = []
        for filepath, code in files.items():
            info = self.parser.parse_file(filepath, code)
            context_parts.append(f"=== FILE: {filepath} ===")
            # Functions
            if info.get("functions"):
                context_parts.append("Functions:")
                for fn in info["functions"]:
                    context_parts.append(f"  {fn['signature']}  # {fn.get('docstring', '')}")
            # Classes
            if info.get("classes"):
                context_parts.append("Classes:")
                for cls in info["classes"]:
                    context_parts.append(f"  class {cls['name']}")
                    for method in cls.get("methods", []):
                        context_parts.append(f"    {method['signature']}")
            # Imports
            if info.get("imports"):
                context_parts.append("Imports: " + ", ".join([imp.get("module", "") for imp in info["imports"]]))
            context_parts.append("")
        return "\n".join(context_parts)

    def inject_into_prompt(self, user_prompt: str, workspace_files: Dict[str, str]) -> str:
        """Prepend structured context to user prompt."""
        context = self.build_agent_context(workspace_files)
        if context.strip():
            return f"=== CURRENT CODEBASE STRUCTURE ===\n{context}\n\n=== USER REQUEST ===\n{user_prompt}"
        return user_prompt
