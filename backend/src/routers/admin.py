from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from src import models, schemas
from src.database import get_db
from src.auth import get_current_user

# Admin dependency
def admin_only(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(admin_only)])

@router.get("/feedback", response_model=List[schemas.Feedback])
def list_all_feedback(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: models.User = Depends(admin_only)  # ensure admin
):
    """List all feedback (admin only)."""
    return db.query(models.Feedback).order_by(models.Feedback.created_at.desc()).offset(skip).limit(limit).all()

@router.delete("/feedback/{feedback_id}")
def delete_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(admin_only)
):
    """Delete a feedback entry."""
    feedback = db.query(models.Feedback).filter(models.Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    db.delete(feedback)
    db.commit()
    return {"message": "Feedback deleted"}
