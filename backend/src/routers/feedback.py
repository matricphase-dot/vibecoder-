# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from src import models, schemas
from src.database import get_db
from src.auth import get_current_user

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

@router.post("/", response_model=schemas.Feedback)
def create_feedback(
    feedback: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Submit feedback (authenticated users only)."""
    db_feedback = models.Feedback(
        user_id=current_user.id,
        message=feedback.message,
        page=feedback.page,
        rating=feedback.rating
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback

@router.get("/", response_model=List[schemas.Feedback])
def list_feedback(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List all feedback (admin only � we can later add admin check)."""
    # For now, any authenticated user can see feedback; we can restrict later.
    return db.query(models.Feedback).offset(skip).limit(limit).all()
