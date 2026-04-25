# backend/src/agents/merge_agent.py
import re
import ollama
from typing import Dict, List

class MergeAgent:
    def __init__(self, model="codellama"):
        self.model = model

    async def validate_imports(self, files: Dict[str, str], plan_entries) -> List[str]:
        errors = []
        for path, content in files.items():
            entry = next((e for e in plan_entries if e.path == path), None)
            if not entry:
                continue
            for exp in entry.exports:
                pattern = rf'def {exp.name}\s*\(|\s*class {exp.name}\s*[:\(]'
                if not re.search(pattern, content):
                    errors.append(f"Missing export {exp.name} in {path}")
        return errors

    async def fix_import_error(self, file_path: str, content: str, error_msg: str) -> str:
        system = f"Fix the following import error in {file_path}. Output only the corrected code.\nError: {error_msg}"
        response = ollama.generate(model=self.model, prompt=content, system=system)
        return response.get('response', content)
