# backend/src/api/verification_routes.py
from fastapi import APIRouter, HTTPException
from src.verification.z3_verifier import Z3Verifier
from src.verification.verif_reporter import format_report
import os
from pathlib import Path

router = APIRouter(prefix="/api/verify", tags=["verification"])
verifier = Z3Verifier()

@router.post("/file")
async def verify_file(request: dict):
    code = request.get("code", "")
    if not code:
        raise HTTPException(400, "No code provided")
    results = verifier.verify_file(code)
    report = format_report(results)
    return {"results": results, "report": report}

@router.get("/workspace")
async def verify_workspace():
    workspace_dir = Path("./workspace")
    if not workspace_dir.exists():
        return {"error": "workspace not found"}
    all_results = {}
    for filepath in workspace_dir.rglob("*.py"):
        code = filepath.read_text(encoding="utf-8")
        results = verifier.verify_file(code)
        if results:
            all_results[str(filepath.relative_to(workspace_dir))] = results
    return all_results
