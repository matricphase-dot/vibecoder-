# backend/src/security/fix_suggester.py
import ollama
import re
from typing import Dict

class FixSuggester:
    def __init__(self, model="codellama"):
        self.model = model

    async def suggest_fix(self, code: str, vuln: Dict) -> str:
        prompt = f"""Security vulnerability found in code:
Vulnerability: {vuln.get('description', '')}
Line: {vuln.get('line', 0)}
Severity: {vuln.get('severity', 'medium')}
CWE: {vuln.get('cwe_id', 'unknown')}

Original code snippet:
```{code}```

Write a corrected version of the code that fixes this vulnerability. Output only the fixed code, no explanations."""
        response = ollama.generate(model=self.model, prompt=prompt)
        fixed = response.get('response', code)
        return fixed

    async def apply_fix(self, original_code: str, vuln: Dict, fixed_snippet: str) -> str:
        # Replace the vulnerable line(s) – simplistic approach
        lines = original_code.splitlines()
        line_num = vuln.get("line", 0)
        if 1 <= line_num <= len(lines):
            lines[line_num-1] = fixed_snippet
        return "\n".join(lines)
