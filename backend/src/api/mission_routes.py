# backend/src/api/mission_routes.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from src.agents.mission_agent import MissionAgent
from pydantic import BaseModel

router = APIRouter(prefix="/api/mission", tags=["mission"])
agent = MissionAgent()

class MissionRequest(BaseModel):
    description: str

@router.post("/start")
async def start_mission(request: MissionRequest, background_tasks: BackgroundTasks):
    # Run mission in background to avoid blocking
    background_tasks.add_task(agent.execute_mission, request.description)
    return {"status": "mission_started", "message": "Mission is running in background. Check /api/mission/status"}

@router.get("/status")
async def mission_status():
    # Placeholder – you would need to store state
    return {"status": "no_active_mission"}
