from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from src import models, schemas
from src.database import get_db
from src.auth import get_current_user

router = APIRouter(prefix="/api/activity", tags=["activity"])

@router.get("/workspace/{workspace_id}", response_model=List[schemas.ActivityLog])
def get_workspace_activity(
    workspace_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check user has access to workspace
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.members.any(id=current_user.id)
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    logs = db.query(models.ActivityLog).filter(
        models.ActivityLog.workspace_id == workspace_id
    ).order_by(models.ActivityLog.timestamp.desc()).limit(limit).all()
    return logs

def log_activity(db: Session, workspace_id: int, user_id: int, action: str, details: dict = None):
    log = models.ActivityLog(
        workspace_id=workspace_id,
        user_id=user_id,
        action=action,
        details=details or {}
    )
    db.add(log)
    db.commit()
