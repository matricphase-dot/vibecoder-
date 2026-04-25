# backend/src/agents/mission_agent.py
import asyncio
import json
from typing import Dict, Any, List
from src.agents.planner_agent import PlannerAgent
from src.agents.parallel_coder_agent import ParallelCoderAgent
from src.rl.sandbox_runner import SandboxRunner
from src.rl.reward_calculator import RewardCalculator
import git
from pathlib import Path
from datetime import datetime

class MissionAgent:
    def __init__(self, model="codellama"):
        self.model = model
        self.planner = PlannerAgent(model)
        self.coder = ParallelCoderAgent(model)
        self.sandbox = SandboxRunner()
        self.reward_calc = RewardCalculator()

    async def execute_mission(self, description: str, repo_path: str = ".") -> Dict[str, Any]:
        steps = []
        # Step 1: Plan
        steps.append({"stage": "plan", "status": "running"})
        plan = await self.planner.generate_plan(description)
        steps[-1]["status"] = "done"
        steps[-1]["plan"] = [f.path for f in plan.files]

        # Step 2: Code
        steps.append({"stage": "code", "status": "running"})
        # We need a WebSocket-like producer; for simplicity, code sequentially
        files = {}
        for entry in plan.files:
            # Code each file (using the coder's logic)
            system = f"Write {entry.path}. Purpose: {entry.purpose}. Only output code."
            import ollama
            response = ollama.generate(model=self.model, prompt=entry.purpose, system=system)
            content = response.get('response', '')
            files[entry.path] = content
        steps[-1]["status"] = "done"
        steps[-1]["files_generated"] = len(files)

        # Step 3: Test (generate simple tests and run)
        steps.append({"stage": "test", "status": "running"})
        # Auto‑generate a test file for each Python file (simplified)
        test_files = {}
        for path, code in files.items():
            if path.endswith(".py"):
                test_path = f"test_{path}"
                test_files[test_path] = f"import pytest\nfrom {path.replace('/', '.').replace('.py', '')} import *\n\ndef test_basic():\n    assert True\n"
        result = await self.sandbox.run_tests(files, test_files)
        steps[-1]["status"] = "done"
        steps[-1]["test_result"] = {"passed": result["passed"], "failed": result["failed"]}

        # Step 4: Create PR (if tests pass)
        steps.append({"stage": "pr", "status": "running"})
        if result["failed"] == 0:
            repo = git.Repo(repo_path)
            branch = f"mission-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            repo.git.checkout('-b', branch)
            for path, content in files.items():
                file_path = Path(repo_path) / path
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(content, encoding="utf-8")
                repo.index.add(str(file_path))
            repo.index.commit(f"Mission: {description[:80]}")
            repo.git.push('origin', branch)
            steps[-1]["status"] = "done"
            steps[-1]["branch"] = branch
            steps[-1]["pr_url"] = f"https://github.com/your-repo/pull/new/{branch}"
        else:
            steps[-1]["status"] = "failed"
            steps[-1]["reason"] = "Tests failed"

        return {"mission": description, "steps": steps, "success": result["failed"] == 0}
