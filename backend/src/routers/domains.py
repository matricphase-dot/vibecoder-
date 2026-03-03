import os
import requests
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from .. import auth, models

router = APIRouter(prefix="/domains", tags=["domains"])

VERCEL_TOKEN = os.getenv("VERCEL_TOKEN")
VERCEL_API = "https://api.vercel.com"

class AddDomainRequest(BaseModel):
    project_id: str
    domain: str

class DomainResponse(BaseModel):
    name: str
    verified: bool
    createdAt: str

@router.get("/{project_id}")
def list_domains(project_id: str, current_user: models.User = Depends(auth.get_current_user)):
    """List all domains for a Vercel project."""
    if not VERCEL_TOKEN:
        raise HTTPException(status_code=500, detail="Vercel token not configured")
    headers = {"Authorization": f"Bearer {VERCEL_TOKEN}"}
    resp = requests.get(f"{VERCEL_API}/v9/projects/{project_id}/domains", headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()

@router.post("/")
def add_domain(req: AddDomainRequest, current_user: models.User = Depends(auth.get_current_user)):
    """Add a custom domain to a Vercel project."""
    if not VERCEL_TOKEN:
        raise HTTPException(status_code=500, detail="Vercel token not configured")
    headers = {"Authorization": f"Bearer {VERCEL_TOKEN}"}
    payload = {"name": req.domain}
    resp = requests.post(f"{VERCEL_API}/v9/projects/{req.project_id}/domains", json=payload, headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()

@router.delete("/{project_id}/{domain}")
def remove_domain(project_id: str, domain: str, current_user: models.User = Depends(auth.get_current_user)):
    """Remove a custom domain from a Vercel project."""
    if not VERCEL_TOKEN:
        raise HTTPException(status_code=500, detail="Vercel token not configured")
    headers = {"Authorization": f"Bearer {VERCEL_TOKEN}"}
    resp = requests.delete(f"{VERCEL_API}/v9/projects/{project_id}/domains/{domain}", headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return {"message": "Domain removed"}

@router.post("/{project_id}/{domain}/verify")
def verify_domain(project_id: str, domain: str, current_user: models.User = Depends(auth.get_current_user)):
    """Verify a custom domain (after DNS configuration)."""
    if not VERCEL_TOKEN:
        raise HTTPException(status_code=500, detail="Vercel token not configured")
    headers = {"Authorization": f"Bearer {VERCEL_TOKEN}"}
    resp = requests.post(f"{VERCEL_API}/v9/projects/{project_id}/domains/{domain}/verify", headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()
