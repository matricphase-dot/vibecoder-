# backend/src/api/security_routes.py
from fastapi import APIRouter, HTTPException
from src.security.vuln_scanner import VulnerabilityScanner
from src.security.fix_suggester import FixSuggester
import os
from pathlib import Path

router = APIRouter(prefix="/api/security", tags=["security"])
scanner = VulnerabilityScanner()
fixer = FixSuggester()

@router.post("/scan")
async def scan_files(files: dict):
    """Scan a dictionary of file paths -> content."""
    results = scanner.scan_workspace(files)
    return results

@router.post("/fix")
async def fix_vulnerability(file_path: str, vulnerability: dict, code: str):
    """Suggest and apply a fix for a vulnerability."""
    fixed_snippet = await fixer.suggest_fix(code, vulnerability)
    return {"fixed_code": fixed_snippet}

@router.get("/report")
async def security_report():
    """Generate a security report for the current workspace."""
    workspace_dir = Path("./workspace")
    if not workspace_dir.exists():
        return {"error": "workspace not found"}
    files = {}
    for filepath in workspace_dir.rglob("*"):
        if filepath.is_file() and filepath.suffix in [".py", ".js", ".html", ".css"]:
            with open(filepath, "r") as f:
                files[str(filepath.relative_to(workspace_dir))] = f.read()
    results = scanner.scan_workspace(files)
    total_vulns = sum(len(v) for v in results.values())
    return {"total_vulnerabilities": total_vulns, "details": results}
