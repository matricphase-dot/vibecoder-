from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, auth, schemas

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

@router.post("/", response_model=schemas.WorkspaceOut)
def create_workspace(workspace: schemas.WorkspaceCreate, db: Session = Depends(auth.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_workspace = models.Workspace(name=workspace.name, owner_id=current_user.id)
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    # Add owner as admin member
    member = models.WorkspaceMember(workspace_id=db_workspace.id, user_id=current_user.id, role="admin")
    db.add(member)
    db.commit()
    return db_workspace

@router.get("/", response_model=List[schemas.WorkspaceOut])
def list_workspaces(db: Session = Depends(auth.get_db), current_user: models.User = Depends(auth.get_current_user)):
    workspaces = db.query(models.Workspace).join(models.WorkspaceMember).filter(models.WorkspaceMember.user_id == current_user.id).all()
    return workspaces

@router.get("/{workspace_id}", response_model=schemas.WorkspaceDetailOut)
def get_workspace(workspace_id: int, db: Session = Depends(auth.get_db), current_user: models.User = Depends(auth.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    # Check membership
    member = db.query(models.WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    return workspace

@router.post("/{workspace_id}/members")
def add_member(workspace_id: int, user_email: str, role: str = "viewer", db: Session = Depends(auth.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Check current user is admin
    member = db.query(models.WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=current_user.id).first()
    if not member or member.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    user = db.query(models.User).filter(models.User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Check if already member
    existing = db.query(models.WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already a member")
    new_member = models.WorkspaceMember(workspace_id=workspace_id, user_id=user.id, role=role)
    db.add(new_member)
    db.commit()
    return {"message": "Member added"}

@router.delete("/{workspace_id}/members/{user_id}")
def remove_member(workspace_id: int, user_id: int, db: Session = Depends(auth.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Check current user is admin
    member = db.query(models.WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=current_user.id).first()
    if not member or member.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    target = db.query(models.WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(target)
    db.commit()
    return {"message": "Member removed"}
