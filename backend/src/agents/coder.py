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

        # Build a prompt that asks for the actual code files based on the plan
        files_desc = "\n".join([f"- {s['file']}: {s['description']}" for s in plan.get('steps', [])])
        system_prompt = "You are an expert full-stack developer. Generate complete, working code for each requested file. Ensure the code is production-ready and follows best practices."
        user_prompt = f"""Based on the following plan, generate the complete code for each file.
Return a JSON object where keys are filenames and values are the file contents.

Plan goal: {plan.get('goal')}
Files needed:
{files_desc}

Make sure the code is self-contained and ready to run. For backend files, include necessary dependencies and configuration.

Example output:
{{
  "index.html": "<html>...</html>",
  "style.css": "body {{ ... }}",
  "app.js": "console.log('hello');",
  "server.js": "const express = require('express');...",
  "package.json": "{{ ... }}"
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

    def _generate_go(self, plan):
        """Generate Go (Gin) backend files."""
        files = {}
        # Copy template files
        template_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'templates', 'go')
        for filename in ['main.go', 'go.mod']:
            with open(os.path.join(template_dir, filename), 'r') as f:
                files[filename] = f.read()
        return files

    def _generate_rust(self, plan):
        """Generate Rust (Actix) backend files."""
        files = {}
        template_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'templates', 'rust')
        for filename in ['main.rs', 'Cargo.toml']:
            with open(os.path.join(template_dir, filename), 'r') as f:
                files[filename] = f.read()
        return files



    def _generate_svelte(self, plan):
        """Generate Svelte frontend files."""
        files = {}
        template_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'templates', 'svelte')
        for filename in ['App.svelte', 'main.js', 'index.html', 'package.json']:
            with open(os.path.join(template_dir, filename), 'r') as f:
                files[filename] = f.read()
        return files
    def _generate_angular(self, plan):
        """Generate Angular frontend files."""
        files = {}
        template_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'templates', 'angular')
        for filename in ['app.module.ts', 'app.component.ts', 'main.ts', 'index.html', 'package.json', 'angular.json']:
            with open(os.path.join(template_dir, filename), 'r') as f:
                files[filename] = f.read()
        return files
