# backend/src/api/cicd_routes.py
from fastapi import APIRouter, HTTPException
from src.cicd.failure_predictor import FailurePredictor
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/cicd", tags=["cicd"])
predictor = FailurePredictor()

class PredictionRequest(BaseModel):
    files: List[str]

@router.post("/train")
async def train_model():
    accuracy = predictor.train()
    return {"status": "trained", "accuracy": accuracy}

@router.post("/predict")
async def predict_failure(request: PredictionRequest):
    result = predictor.predict(request.files)
    return result

@router.get("/health")
async def cicd_health():
    return {"status": "ready"}
