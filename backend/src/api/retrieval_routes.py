# backend/src/api/retrieval_routes.py
from fastapi import APIRouter
from src.retrieval.bm25_index import get_bm25

router = APIRouter(prefix="/api/retrieval", tags=["retrieval"])

@router.post("/rebuild_bm25")
async def rebuild_bm25():
    from src.retrieval.bm25_index import BM25Index
    # Force rebuild
    idx = BM25Index()
    return {"status": "rebuilt"}
