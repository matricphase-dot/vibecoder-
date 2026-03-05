from src.auth import get_current_user
from src import models
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src import models, schemas
from src.database import get_db

router = APIRouter(prefix="/api/beta", tags=["beta"])

@router.post("/signup", response_model=schemas.BetaSignup)
def signup(beta: schemas.BetaSignupCreate, db: Session = Depends(get_db)):
    """Add an email to the beta waitlist."""
    # Check if email already exists
    existing = db.query(models.BetaSignup).filter(models.BetaSignup.email == beta.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_signup = models.BetaSignup(email=beta.email)
    db.add(db_signup)
    db.commit()
    db.refresh(db_signup)
    return db_signup

@router.get("/signups", response_model=list[schemas.BetaSignup])
def list_signups(db: Session = Depends(get_db)):
    """List all beta signups (for admin use)."""
    return db.query(models.BetaSignup).order_by(models.BetaSignup.created_at.desc()).all()


@router.get("/signups", response_model=list[schemas.BetaSignup])
def list_signups(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """List all beta signups (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return db.query(models.BetaSignup).order_by(models.BetaSignup.created_at.desc()).all()

@router.delete("/signups/{signup_id}")
def delete_signup(signup_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Delete a beta signup (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    signup = db.query(models.BetaSignup).filter(models.BetaSignup.id == signup_id).first()
    if not signup:
        raise HTTPException(status_code=404, detail="Signup not found")
    db.delete(signup)
    db.commit()
    return {"message": "Signup deleted"}
