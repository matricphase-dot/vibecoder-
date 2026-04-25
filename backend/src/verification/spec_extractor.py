# backend/src/verification/spec_extractor.py
import re
import ollama
from typing import List, Dict, Optional

class FunctionSpec:
    def __init__(self, name: str, params: List[str], preconditions: List[str], postconditions: List[str]):
        self.name = name
        self.params = params
        self.preconditions = preconditions
        self.postconditions = postconditions

class SpecExtractor:
    def __init__(self, model="codellama"):
        self.model = model

    def extract_from_docstring(self, code: str) -> List[FunctionSpec]:
        specs = []
        # Simple regex to find function definitions and docstrings
        pattern = r'def\s+(\w+)\s*\(([^)]*)\):\s*"""(.*?)"""'
        matches = re.findall(pattern, code, re.DOTALL)
        for name, params_str, docstring in matches:
            params = [p.strip().split('=')[0].strip() for p in params_str.split(',') if p.strip()]
            # Parse @pre and @post from docstring
            preconditions = re.findall(r'@pre:\s*(.+?)(?=\n|$)', docstring)
            postconditions = re.findall(r'@post:\s*(.+?)(?=\n|$)', docstring)
            specs.append(FunctionSpec(name, params, preconditions, postconditions))
        return specs

    async def infer_specs_with_llm(self, code: str) -> List[FunctionSpec]:
        prompt = f"""Analyze the following Python function and infer its specification.
Output a JSON list of functions with: name, params, preconditions, postconditions.
Use simple conditions like "x > 0", "result > 0", etc.
Code:
{code}
"""
        response = ollama.generate(model=self.model, prompt=prompt)
        try:
            import json
            data = json.loads(response['response'])
            specs = []
            for item in data:
                specs.append(FunctionSpec(
                    name=item.get("name", ""),
                    params=item.get("params", []),
                    preconditions=item.get("preconditions", []),
                    postconditions=item.get("postconditions", [])
                ))
            return specs
        except:
            return []
