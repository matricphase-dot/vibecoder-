# test_routes.py – isolated test endpoint for generation
from fastapi import APIRouter, Request
from src.generation import GenerationOrchestrator

router = APIRouter(prefix="/test", tags=["test"])

@router.post("/generate")
async def test_generate(request: Request):
    try:
        body = await request.json()
        prompt = body.get("prompt", "")
        if not prompt:
            return {"error": "No prompt provided"}
        orch = GenerationOrchestrator()
        files = {}
        async for event in orch.generate(prompt):
            if event.get("type") == "file":
                files[event["path"]] = event["content"]
        return {"files": files, "count": len(files)}
    except Exception as e:
        return {"error": str(e)}
