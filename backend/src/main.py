# backend/src/main.py – fixed WebSocket + CORS
import asyncio
import json
import logging
import traceback
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from src.generation import GenerationOrchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vibecoder")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.websocket("/ws")
async def ws_generate(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connected")
    try:
        while True:
            raw = await websocket.receive_text()
            logger.info(f"Received: {raw[:100]}")
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            if data.get("type") == "generate":
                prompt = data.get("prompt", "Hello world app")
                logger.info(f"Generating for: {prompt}")
                try:
                    orch = GenerationOrchestrator()
                    async for event in orch.generate(prompt, "standard", "react"):
                        await websocket.send_json(event)
                        logger.info(f"Sent: {event.get('type')}")
                except Exception as e:
                    logger.error(f"Generation error: {e}")
                    logger.error(traceback.format_exc())
                    await websocket.send_json({"type": "error", "message": str(e)})
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        logger.error(traceback.format_exc())

@app.post("/git/commit")
async def git_commit(message: str):
    import subprocess
    try:
        subprocess.run(["git", "add", "."], cwd=WORKSPACE_DIR, check=True)
        subprocess.run(["git", "commit", "-m", message], cwd=WORKSPACE_DIR, check=True)
        return {"status": "committed", "message": message}
    except Exception as e:
        return {"error": str(e)}

@app.post("/git/branch")
async def git_branch(branch: str):
    import subprocess
    try:
        subprocess.run(["git", "checkout", "-b", branch], cwd=WORKSPACE_DIR, check=True)
        return {"status": "branch created", "branch": branch}
    except Exception as e:
        return {"error": str(e)}

@app.post("/deploy")
async def deploy_to_vercel():
    # Placeholder â€“ in real scenario, you'd run `vercel --prod`
    return {"url": "https://your-vercel-app.vercel.app", "status": "deployed"}

@app.post("/voice/command")
async def voice_command(data: dict):
    text = data.get("text", "").lower()
    if "refactor" in text:
        return {"action": "refactor", "target": "current_function"}
    elif "comment" in text:
        return {"action": "toggle_comment"}
    elif "deploy" in text:
        return {"action": "deploy"}
    elif "commit" in text:
        return {"action": "git_commit"}
    elif "branch" in text:
        words = text.split()
        branch = words[words.index("branch") + 1]
        return {"action": "git_branch", "branch": branch}
    else:
        return {"action": "generate", "prompt": data.get("text", "")}
@app.get("/git/status")
async def git_status():
    import subprocess
    try:
        result = subprocess.run(["git", "status", "--porcelain"], cwd="workspace", capture_output=True, text=True)
        changed = [line for line in result.stdout.splitlines() if line.strip()]
        return {"changed": changed}
    except:
        return {"changed": []}
from fastapi.responses import FileResponse
import zipfile
import os
@app.get("/export/zip")
async def export_zip():
    zip_path = "workspace.zip"
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for root, dirs, files in os.walk("workspace"):
            for file in files:
                zipf.write(os.path.join(root, file), arcname=file)
    return FileResponse(zip_path, media_type="application/zip", filename="project.zip")

@app.get("/api/health")
async def health():
    return {"status": "ok", "mode": "railway"}
