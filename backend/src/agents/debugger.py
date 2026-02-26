import os
import json
from dotenv import load_dotenv
from ..core.llm_client import call_llm_with_retry
from ..core.json_utils import extract_json

load_dotenv()

class DebuggerAgent:
    async def debug_failure(self, project_path: str, files: dict, test_results: dict, plan: dict) -> dict:
        failed_tests = [t for t in test_results.get('details', []) if not t['passed']]
        if not failed_tests:
            return {}

        errors_desc = "\n".join([f"- {t['test']}: {t.get('details', 'unknown')}" for t in failed_tests])
        code_summary = "\n".join([f"File {fname}:\n{content[:500]}..." for fname, content in files.items()])

        system_prompt = "You are an expert debugger. Provide fixed code as JSON."
        user_prompt = f"""The following web app failed verification tests.
Current code:
{code_summary}

Failed tests:
{errors_desc}

Original plan goal: {plan.get('goal')}
Tasks: {plan.get('steps')}

Analyse the failures and provide corrected code. Return a JSON object where keys are filenames and values are the fixed file contents.
Only include files that need changes. If no changes are needed, return an empty object.
Make sure the code is self-contained and fixes the issues described.
"""
        text = await call_llm_with_retry(prompt=user_prompt, system_prompt=system_prompt)

        try:
            fixed_files = extract_json(text)
        except ValueError as e:
            raise Exception(f"Failed to parse JSON from debugger: {e}")

        for fname, content in fixed_files.items():
            filepath = os.path.join(project_path, fname)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"?? Debugger fixed {fname}")

        return fixed_files
