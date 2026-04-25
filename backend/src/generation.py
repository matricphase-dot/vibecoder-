# backend/src/generation.py - Full recursive planner + parallel coder + merge
import asyncio
import json
import ollama
import os
from pathlib import Path
from typing import AsyncGenerator, Dict, Any
from src.agents.planner_agent import PlannerAgent
from src.agents.parallel_coder_agent import ParallelCoderAgent
from src.agents.merge_agent import MergeAgent
from src.ast.context_builder import ContextBuilder
from src.retrieval.hybrid_rag import HybridRetriever

class GenerationOrchestrator:
    def __init__(self, model="codellama"):
        self.model = model
        self.planner = PlannerAgent(model)
        self.coder = ParallelCoderAgent(model)
        self.merger = MergeAgent(model)
        self.context_builder = ContextBuilder()
        self.retriever = HybridRetriever()

    async def generate(self, prompt: str, plan_type: str, template: str, websocket=None) -> AsyncGenerator[Dict[str, Any], None]:
        workspace_dir = Path("./workspace")
        existing_files = {}
        if workspace_dir.exists():
            for filepath in workspace_dir.rglob("*"):
                if filepath.is_file():
                    with open(filepath, "r", encoding="utf-8") as f:
                        existing_files[str(filepath.relative_to(workspace_dir))] = f.read()

        # Step 0: retrieve relevant context
        yield {"type": "log", "message": "🔍 Retrieving relevant code context..."}
        chunks = self.retriever.retrieve(prompt, current_file=None, top_k=5)
        context = self.retriever.build_context_string(chunks)
        augmented_prompt = f"{context}\n\n=== USER REQUEST ===\n{prompt}"

        # Step 1: Plan (20‑50 files)
        yield {"type": "log", "message": "📋 Creating file plan..."}
        plan = await self.planner.generate_plan(augmented_prompt)
        yield {"type": "log", "message": f"📝 Planned {len(plan.files)} files"}

        # Step 2: Parallel coding (with real WebSocket if provided)
        yield {"type": "log", "message": "⚡ Coding files in parallel..."}
        # We need to call the coder's generate_all, which already streams files via websocket.
        # The ParallelCoderAgent expects a WebSocket; if None, we simulate.
        if websocket:
            files = await self.coder.generate_all(plan, websocket)
        else:
            # Simulate: code each file one by one without streaming (for when websocket not passed)
            files = {}
            for entry in plan.files:
                response = ollama.generate(model=self.model, prompt=entry.purpose, system=f"Write {entry.path}. Only code.")
                content = response.get('response', '')
                files[entry.path] = content
                yield {"type": "file", "path": entry.path, "content": content}
                await asyncio.sleep(0.2)

        # Step 3: Merge & fix imports
        yield {"type": "log", "message": "🔄 Validating and fixing imports..."}
        files = await self.merger.merge_and_fix(files, plan.files)

        # Save all files to workspace
        for path, content in files.items():
            full_path = workspace_dir / path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)

        yield {"type": "complete"}
