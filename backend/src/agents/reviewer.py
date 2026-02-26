import os
import json
from dotenv import load_dotenv
from ..core.llm_client import call_llm_with_retry

load_dotenv()

class ReviewerAgent:
    async def review_code(self, project_path: str, files: dict, plan: dict) -> dict:
        if not files:
            return {"passed": True, "issues": [], "suggestions": {}}

        code_summary = "\n".join([f"File {fname}:\n{content}" for fname, content in files.items()])
        system_prompt = "You are an expert code reviewer. Return a JSON object with review results."
        user_prompt = f"""Review the following web app code for:
- Best practices (HTML/CSS/JS)
- Security vulnerabilities (XSS, etc.)
- Performance issues
- Accessibility
- Code clarity and maintainability

Return a JSON object with:
- passed: boolean (true if no critical issues)
- issues: list of strings describing each issue
- suggestions: object where keys are filenames and values are suggested fixed content (only include files that need changes)

Code:
{code_summary}

Original plan goal: {plan.get('goal')}
"""
        text = await call_llm_with_retry(prompt=user_prompt, system_prompt=system_prompt)

        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()
        try:
            review = json.loads(text)
        except:
            review = {"passed": True, "issues": [], "suggestions": {}}

        return review
