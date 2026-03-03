from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from src import models, schemas
from src.database import get_db
from src.auth import get_current_user

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])

@router.get("/items", response_model=List[schemas.MarketplaceItem])
def list_items(type: str = None, db: Session = Depends(get_db)):
    """List all marketplace items, optionally filtered by type."""
    query = db.query(models.MarketplaceItem)
    if type:
        query = query.filter(models.MarketplaceItem.type == type)
    return query.order_by(models.MarketplaceItem.downloads.desc()).all()

@router.get("/items/{item_id}", response_model=schemas.MarketplaceItem)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.MarketplaceItem).filter(models.MarketplaceItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.post("/items", response_model=schemas.MarketplaceItem)
def create_item(
    item: schemas.MarketplaceItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Publish a new item to the marketplace."""
    db_item = models.MarketplaceItem(
        **item.dict(),
        author_id=current_user.id
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.post("/items/{item_id}/download")
def download_item(item_id: int, db: Session = Depends(get_db)):
    """Increment download count and return item content."""
    item = db.query(models.MarketplaceItem).filter(models.MarketplaceItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.downloads += 1
    db.commit()
    return {"content": item.content}

@router.post("/items/{item_id}/rate")
def rate_item(item_id: int, rating: float, db: Session = Depends(get_db)):
    """Submit a rating (1-5). Updates average rating."""
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    item = db.query(models.MarketplaceItem).filter(models.MarketplaceItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    # Simple moving average (for simplicity)
    item.rating = (item.rating * item.downloads + rating) / (item.downloads + 1)
    db.commit()
    return {"new_rating": item.rating}
