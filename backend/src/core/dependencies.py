from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from src import models
from src.database import get_db
from src.auth import get_current_user

def check_plan_limit(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Check if user's plan allows further actions. Raise 402 if limit reached."""
    if current_user.plan == 'free_trial':
        if datetime.utcnow() > current_user.trial_start + timedelta(days=1):
            current_user.plan = 'expired'
            db.commit()
            raise HTTPException(
                status_code=402,
                detail="Free trial expired. Please upgrade to continue."
            )
    elif current_user.plan == 'expired':
        raise HTTPException(
            status_code=402,
            detail="Your free trial has expired. Please upgrade."
        )
    return current_user

def increment_project_count(db: Session, user: models.User):
    """Increment projects_used and check limit."""
    if user.plan == 'free_trial':
        if user.projects_used >= user.max_projects:
            raise HTTPException(
                status_code=402,
                detail="Free trial project limit reached. Please upgrade."
            )
        user.projects_used += 1
        db.commit()
