import asyncio
import sys
import traceback
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import json
from .agents.planner import PlannerAgent
from .agents.coder import CoderAgent
from .agents.verifier import VerifierAgent
from .agents.debugger import DebuggerAgent
from .agents.reviewer import ReviewerAgent
from .core.project_manager import ProjectManager
from backend.deployment.vercel_deployer import VercelDeployer
from backend.src.memory.artifact_store import ArtifactStore
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("workspace", exist_ok=True)
app.mount("/projects", StaticFiles(directory="workspace"), name="projects")

vercel_token = os.getenv("VERCEL_TOKEN")
deployer = VercelDeployer(vercel_token) if vercel_token else None

@app.get("/")
async def root():
    return {"message": "VibeCoding Platform Backend"}


@app.get("/projects/list")
async def list_projects():
    store = ArtifactStore()
    projects = store.list_all_successes()
    store.close()
    return {"projects": projects}

@app.get("/projects/list")
async def list_projects():
    store = ArtifactStore()
    projects = store.list_all_successes()
    store.close()
    return {"projects": projects}
@app.get("/projects/list")
async def list_projects():
    store = ArtifactStore()
    projects = store.list_all_successes()
    store.close()
    return {"projects": projects}

@app.post("/deploy")
async def deploy_project(req: dict):
    project_id = req.get("project_id")
    project_name = req.get("project_name")
    if not project_id:
        return {"error": "Missing project_id"}
    project_path = f"workspace/{project_id}"
    if not os.path.exists(project_path):
        return {"error": "Project not found"}
    if not deployer:
        return {"error": "Vercel deployer not configured"}
    try:
        name = project_name or f"project-{project_id}"
        url = await deployer.deploy(project_path, name)
        return {"url": url}
    except Exception as e:
        return {"error": str(e)}

@app.post("/deploy")
async def deploy_project(req: dict):
    project_id = req.get("project_id")
    project_name = req.get("project_name")
    if not project_id:
        return {"error": "Missing project_id"}
    project_path = f"workspace/{project_id}"
    if not os.path.exists(project_path):
        return {"error": "Project not found"}
    if not deployer:
        return {"error": "Vercel deployer not configured"}
    try:
        name = project_name or f"project-{project_id}"
        url = await deployer.deploy(project_path, name)
        return {"url": url}
    except Exception as e:
        return {"error": str(e)}


@app.post("/debug")
async def debug_specific_failure(req: dict):
    project_id = req.get("project_id")
    test_description = req.get("test_description")
    file_name = req.get("file_name", None)
    
    if not project_id or not test_description:
        return {"error": "Missing project_id or test_description"}
    
    project_path = f"workspace/{project_id}"
    if not os.path.exists(project_path):
        return {"error": "Project not found"}
    
    # Read current files
    files = {}
    for fname in os.listdir(project_path):
        if fname.endswith(('.html', '.css', '.js')):
            with open(os.path.join(project_path, fname), 'r', encoding='utf-8') as f:
                files[fname] = f.read()
    
    # Create a minimal test_results structure
    test_results = {
        "passed": False,
        "details": [{"test": test_description, "passed": False, "details": "User requested fix"}]
    }
    plan = {"goal": "Fix specific issue", "steps": []}
    
    # Run debugger
    debugger = DebuggerAgent()
    fixed_files = await debugger.debug_failure(project_path, files, test_results, plan)
    
    if fixed_files:
        return {"success": True, "fixed_files": list(fixed_files.keys())}
    else:
        return {"success": False, "message": "Debugger could not fix the issue"}


async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    store = None
    try:
        data = await websocket.receive_json()
        user_prompt = data.get("prompt", "")
        
        await websocket.send_json({"type": "status", "message": "?? Planning..."})
        planner = PlannerAgent()
        plan = await planner.create_plan(user_prompt)
        
        await websocket.send_json({
            "type": "plan",
            "data": plan,
            "message": f"?? Planned {len(plan.get('steps', []))} tasks"
        })
        
        project_id = ProjectManager.create_project({})
        coder = CoderAgent()
        files = await coder.generate_files(plan, project_id)
        project_path = f"workspace/{project_id}"
        
        await websocket.send_json({
            "type": "files",
            "files": files,
            "message": f"?? Generated {len(files)} files"
        })

        verifier = VerifierAgent()
        test_results = await verifier.verify_web_app(project_path, plan.get("verification_tests", []))
        passed = test_results['passed']
        attempts = 0
        while not passed and attempts < 1:
            attempts += 1
            await websocket.send_json({"type": "status", "message": f"?? Debugging attempt {attempts}..."})
            debugger = DebuggerAgent()
            fixed_files = await debugger.debug_failure(project_path, files, test_results, plan)
            if fixed_files:
                files.update(fixed_files)
                test_results = await verifier.verify_web_app(project_path, plan.get("verification_tests", []))
                passed = test_results['passed']
            else:
                break

        await websocket.send_json({"type": "status", "message": "?? Reviewing code quality..."})
        reviewer = ReviewerAgent()
        review = await reviewer.review_code(project_path, files, plan)
        if not review.get("passed", True):
            issues = review.get("issues", [])
            await websocket.send_json({
                "type": "status",
                "message": f"?? Review found {len(issues)} issues: {', '.join(issues[:3])}"
            })
            if review.get("suggestions"):
                test_results = await verifier.verify_web_app(project_path, plan.get("verification_tests", []))
                passed = test_results['passed']
        else:
            await websocket.send_json({"type": "status", "message": "? Code review passed"})

        await websocket.send_json({
            "type": "verification",
            "results": test_results,
            "message": f"? Verification {'passed' if passed else 'failed'}"
        })

        # Deployment
        url = None
        if passed and deployer:
            await websocket.send_json({"type": "status", "message": "?? Deploying to Vercel..."})
            project_name = plan.get('goal', 'app').replace(' ', '-').lower()[:20]
            try:
                url = await deployer.deploy(project_path, project_name)
                await websocket.send_json({"type": "status", "message": f"? Deployed to {url}"})
            except Exception as e:
                print(f"Deployment failed: {traceback.format_exc()}")
                url = f"http://localhost:8000/projects/{project_id}/index.html"
                await websocket.send_json({"type": "status", "message": f"?? Local preview (deploy failed): {url}"})
        else:
            url = f"http://localhost:8000/projects/{project_id}/index.html"
            await websocket.send_json({"type": "status", "message": f"?? Local preview: {url}"})

        store = ArtifactStore()
        if passed:
            store.store_success(user_prompt, plan, url)
        else:
            store.store_failure(user_prompt, plan, str(test_results['details']))

        await websocket.send_json({
            "type": "complete",
            "url": url,
            "project_id": project_id,
            "message": "? Your app is ready!"
        })
        
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"? Unhandled exception: {traceback.format_exc()}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        if store:
            store.close()










