from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict
from ..core import linter

router = APIRouter(prefix="/lint", tags=["linting"])

class LintRequest(BaseModel):
    files: Dict[str, str]  # filename -> content

class LintResponse(BaseModel):
    results: Dict[str, dict]

@router.post("/", response_model=LintResponse)
async def lint_files(request: LintRequest):
    try:
        results = linter.lint_code(request.files)
        return LintResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
