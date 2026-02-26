import os
import json
from dotenv import load_dotenv
from ..core.llm_client import call_llm_with_retry
from ..core.json_utils import extract_json

load_dotenv()

class CoderAgent:
    async def generate_files(self, plan: dict, project_id: str):
        project_path = f"workspace/{project_id}"
        os.makedirs(project_path, exist_ok=True)

        steps_desc = "\n".join([f"- {s['file']}: {s['description']}" for s in plan.get('steps', [])])
        system_prompt = "You are an expert web developer. Generate code as a valid JSON object."
        user_prompt = f"""Based on the following plan, generate the complete code for each file.
Return a JSON object where keys are filenames and values are the file contents. Ensure the JSON is valid: escape any backslashes in strings (e.g., replace "\\" with "\\\\") and do not include any text outside the JSON.

Plan goal: {plan.get('goal')}
Files needed:
{steps_desc}

Make sure the code is self-contained, uses vanilla HTML/CSS/JavaScript (unless otherwise specified), and is ready to run in a browser.

Example output:
{{
  "index.html": "<html>...</html>",
  "style.css": "body {{ ... }}",
  "app.js": "console.log('hello');"
}}
"""
        text = await call_llm_with_retry(prompt=user_prompt, system_prompt=system_prompt)

        try:
            files = extract_json(text)
        except ValueError as e:
            raise Exception(f"Failed to parse JSON from LLM response: {e}")

        for filename, content in files.items():
            filepath = os.path.join(project_path, filename)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"? Generated {filename}")

        return files
