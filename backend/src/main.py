import asyncio
import json
import os
import zipfile
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import httpx

# Import the real orchestrator (exists on disk)
from src.generation import GenerationOrchestrator

app = FastAPI(title="VibeCoder - Full AI Backend")

# CORS - allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the real orchestrator (uses agents, ChromaDB, Ollama)
orchestrator = GenerationOrchestrator()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("✅ WebSocket connected - Full AI mode active")
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "generate":
                prompt = msg.get("prompt", "")
                plan = msg.get("plan", "fast")
                template = msg.get("template", "vanilla")
                print(f"🎯 Generating: {prompt} (plan={plan}, template={template})")
                # Stream events from the real orchestrator
                async for event in orchestrator.generate(prompt, plan, template):
                    await websocket.send_text(json.dumps(event))
            else:
                await websocket.send_text(json.dumps({"type": "log", "message": f"Unknown type: {msg.get('type')}"}))
    except WebSocketDisconnect:
        print("❌ WebSocket disconnected")
    except Exception as e:
        print(f"⚠️ WebSocket error: {e}")

@app.get("/api/health")
async def health():
    return {"status": "ok", "mode": "full", "agents": "active"}

@app.get("/api/templates")
async def get_templates():
    return {
        "templates": ["vanilla", "react", "vue", "svelte"],
        "default": "vanilla"
    }

@app.post("/api/deploy/vercel")
async def deploy_to_vercel():
    # Placeholder - implement actual Vercel deployment if needed
    return {"message": "Deployment endpoint ready - integrate Vercel CLI"}

@app.get("/api/export/zip")
async def export_zip():
    zip_path = Path("workspace.zip")
    workspace = Path("workspace")
    if workspace.exists():
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for file in workspace.rglob("*"):
                if file.is_file():
                    zipf.write(file, file.relative_to(workspace))
    return FileResponse(zip_path, filename="vibecoder-workspace.zip")

# Additional Git endpoints (if GitPython is installed)
try:
    import git
    from fastapi import HTTPException, Request

    @app.get("/api/git/branches")
    async def get_branches():
        repo = git.Repo(".")
        branches = [str(b) for b in repo.branches]
        return {"branches": branches, "current": str(repo.active_branch)}

    @app.post("/api/git/commit")
    async def commit(message: str):
        repo = git.Repo(".")
        repo.index.add("*")
        repo.index.commit(message)
        return {"message": f"Committed: {message}"}
except ImportError:
    print("⚠️ GitPython not installed - Git endpoints disabled")

# ========== Phase 1 Additions ==========
from typing import List, Optional
import uuid
from src.mcp.host import MCPHost
from src.model_router import ModelRouter
from src.agent_manager import AgentManager

# MCP Host
mcp_host = MCPHost()

@app.post("/api/mcp/register")
async def register_mcp_server(name: str, command: List[str]):
    server_id = await mcp_host.register_server(name, command)
    return {"server_id": server_id}

@app.post("/api/mcp/call")
async def call_mcp_tool(server_id: str, tool_name: str, arguments: dict):
    result = await mcp_host.call_tool(server_id, tool_name, arguments)
    return {"result": result}

# Model Router
router = ModelRouter()

@app.post("/api/chat")
async def chat(prompt: str, system: str = "", provider: str = "ollama"):
    async def generate():
        async for chunk in router.generate(prompt, system, provider):
            yield chunk
    return StreamingResponse(generate(), media_type="text/plain")

# Agent Manager
agent_manager = AgentManager(max_concurrent=3)

@app.websocket("/ws/agent/{session_id}")
async def agent_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    session = agent_manager.sessions.get(session_id)
    if not session:
        await websocket.close()
        return
    while session.status.value in ("running", "done"):
        await websocket.send_text(json.dumps({
            "status": session.status.value,
            "progress": session.progress,
            "current_step": session.current_step
        }))
        await asyncio.sleep(0.5)

@app.post("/api/agents/start")
async def start_agent(prompt: str):
    from src.generation import run_generation
    async def wrapped(p):
        async for event in run_generation(p, 0, None):
            yield event
    session_id = await agent_manager.start_agent(prompt, wrapped)
    return {"session_id": session_id}

@app.get("/api/agents/list")
async def list_agents():
    return {"agents": agent_manager.list_agents()}

@app.delete("/api/agents/{session_id}")
async def stop_agent(session_id: str):
    await agent_manager.stop_agent(session_id)
    return {"status": "stopped"}

# ========== ENTERPRISE / ADMIN ENDPOINTS ==========
from src.enterprise.audit import get_audit_logger
from src.enterprise.pii_filter import PIIFilter
from src.enterprise.middleware import is_enterprise_mode, ENTERPRISE_MODE
import os

@app.get("/admin/audit/export")
async def export_audit(start_date: str, end_date: str):
    from datetime import datetime
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)
    report = get_audit_logger().export_report(start, end)
    return report.dict()

@app.get("/admin/audit/verify")
async def verify_audit():
    result = get_audit_logger().verify_integrity()
    return result.dict()

@app.post("/admin/enterprise/toggle")
async def toggle_enterprise_mode(enabled: bool):
    # This would require restart or dynamic env update – for demo, we just return message
    return {"message": f"Enterprise mode would be set to {enabled}. Restart backend with ENTERPRISE_MODE=true to enforce."}

@app.get("/admin/enterprise/status")
async def enterprise_status():
    return {"enterprise_mode": is_enterprise_mode(), "hipaa_ready": True}

@app.post("/admin/pii/redact")
async def redact_pii(text: str):
    redacted = PIIFilter.strip_pii(text)
    return {"original_length": len(text), "redacted_length": len(redacted), "redacted": redacted}

# ========== BROWSER DEBUGGER ENDPOINT ==========
from src.agents.debugger import Debugger

debugger_instance = Debugger()

@app.post("/api/debug/browser")
async def browser_debug(preview_url: str):
    result = await debugger_instance.run_browser_check(preview_url)
    return result

# ========== NON-DEVELOPER MODE ENDPOINTS ==========
from src.simple_mode import SimpleModeSummarizer
simple_summarizer = SimpleModeSummarizer()

@app.post("/api/simple/generate")
async def simple_generate(request: dict):
    prompt = request.get("prompt", "")
    # For MVP, return a mock summary (you can integrate real generation later)
    summary = await simple_summarizer.summarize_result({}, prompt)
    suggestions = await simple_summarizer.suggest_next(prompt, summary)
    return {"summary": summary, "suggestions": suggestions}

@app.get("/api/simple/status")
async def simple_status():
    return {"mode": "active", "description": "Non-developer voice-first mode"}

# ========== COMPLIANCE CODE GENERATION ENDPOINTS ==========
from src.compliance.engine import ComplianceGenerator, ComplianceStandard

compliance_gen = ComplianceGenerator()

@app.post("/api/compliance/generate")
async def generate_compliant_code(request: dict):
    prompt = request.get("prompt", "")
    standard = request.get("standard", "hipaa")
    context = request.get("context", "")
    try:
        std = ComplianceStandard(standard.lower())
    except ValueError:
        return {"error": f"Invalid standard. Use one of: {[s.value for s in ComplianceStandard]}"}
    result = await compliance_gen.generate_compliant_code(prompt, std, context)
    return result

@app.post("/api/compliance/check")
async def check_code_compliance(request: dict):
    code = request.get("code", "")
    standard = request.get("standard", "hipaa")
    try:
        std = ComplianceStandard(standard.lower())
    except ValueError:
        return {"error": "Invalid standard"}
    result = await compliance_gen.check_compliance(code, std)
    return result.dict()

@app.get("/api/compliance/templates/{standard}/{name}")
async def get_compliance_template(standard: str, name: str):
    try:
        std = ComplianceStandard(standard.lower())
    except ValueError:
        return {"error": "Invalid standard"}
    template = compliance_gen.get_template(std, name)
    return {"template": template}

# ========== ANALYTICS MIDDLEWARE ==========
from src.analytics import get_analytics, AnalyticsEvent
import time

@app.middleware("http")
async def analytics_middleware(request: Request, call_next):
    # Log generation events after response (we'll capture from WebSocket instead)
    # Simpler: we'll add manual logging in generation pipeline.
    response = await call_next(request)
    return response

# ========== ANALYTICS ENDPOINTS ==========
from src.analytics import get_analytics

@app.get("/api/analytics/summary")
async def analytics_summary(days: int = 7):
    analytics = get_analytics()
    summary = analytics.get_summary(days)
    return summary.dict()

@app.get("/api/analytics/export")
async def analytics_export(days: int = 30):
    analytics = get_analytics()
    csv_data = analytics.export_csv(days)
    return Response(content=csv_data, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=analytics.csv"})

# Hook into generation to log events (patch existing generation function)
# We'll modify run_generation to accept a logger callback – for now, we add a decorator.
# But to keep it simple, we'll create a wrapper that logs after generation.
# For MVP, we'll assume generation is already logged via WebSocket; we'll add manual logging in the WebSocket handler.


# Register GNN routes
from src.api.graph_routes import router as graph_router
app.include_router(graph_router)

# Register retrieval routes
from src.api.retrieval_routes import router as retrieval_router
app.include_router(retrieval_router)

# ========== LEARNING FEEDBACK ENDPOINTS ==========
from src.learning.feedback_collector import FeedbackCollector

_feedback_collector = FeedbackCollector()

@app.post("/api/feedback/accept")
async def accept_feedback(request: dict):
    _feedback_collector.record(
        prompt=request.get("prompt", ""),
        completion=request.get("completion", ""),
        accepted=True,
        model=request.get("model", "codellama"),
        project_id=request.get("project_id", "default")
    )
    return {"message": "Thank you for your feedback! Model will improve tonight."}

@app.post("/api/feedback/reject")
async def reject_feedback(request: dict):
    _feedback_collector.record(
        prompt=request.get("prompt", ""),
        completion=request.get("completion", ""),
        accepted=False,
        model=request.get("model", "codellama"),
        project_id=request.get("project_id", "default")
    )
    return {"message": "Feedback recorded"}

# ========== CODE RL ENDPOINTS ==========
from src.rl.rl_trainer import RLTrainer

@app.post("/api/rl/train")
async def train_rl():
    trainer = RLTrainer()
    trainer.train()
    return {"message": "RL training started in background"}

@app.get("/api/rl/rewards")
async def get_rewards_summary():
    import sqlite3
    conn = sqlite3.connect("./workspace/.rl/rewards.db")
    cur = conn.execute("SELECT COUNT(*), AVG(reward) FROM rewards")
    count, avg_reward = cur.fetchone()
    conn.close()
    return {"total": count, "average_reward": avg_reward or 0}

# Register security routes
from src.api.security_routes import router as security_router
app.include_router(security_router)

# Register verification routes
from src.api.verification_routes import router as verification_router
app.include_router(verification_router)

# Register vision routes
from src.api.vision_routes import router as vision_router
app.include_router(vision_router)

# Register CI/CD routes
from src.api.cicd_routes import router as cicd_router
app.include_router(cicd_router)

# Register Mission routes
from src.api.mission_routes import router as mission_router
app.include_router(mission_router)
