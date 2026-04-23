# backend/src/agent_manager.py
import asyncio, uuid, time
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum

class AgentStatus(Enum):
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"

@dataclass
class AgentSession:
    id: str
    prompt: str
    status: AgentStatus
    progress: int = 0
    current_step: str = ""
    created_at: float = field(default_factory=time.time)
    result: Optional[str] = None

class AgentManager:
    def __init__(self, max_concurrent=3):
        self.sessions: Dict[str, AgentSession] = {}
        self.tasks: Dict[str, asyncio.Task] = {}
        self.max_concurrent = max_concurrent
        self._semaphore = asyncio.Semaphore(max_concurrent)

    async def start_agent(self, prompt: str, generation_func) -> str:
        session_id = str(uuid.uuid4())
        session = AgentSession(id=session_id, prompt=prompt, status=AgentStatus.RUNNING)
        self.sessions[session_id] = session
        task = asyncio.create_task(self._run_agent(session_id, generation_func))
        self.tasks[session_id] = task
        return session_id

    async def _run_agent(self, session_id: str, generation_func):
        async with self._semaphore:
            session = self.sessions[session_id]
            try:
                async for event in generation_func(session.prompt):
                    if event.get("type") == "log":
                        session.current_step = event.get("message", "")
                    if event.get("type") == "file":
                        session.progress += 10
                    # also forward to WebSocket later
                session.status = AgentStatus.DONE
                session.progress = 100
            except Exception as e:
                session.status = AgentStatus.ERROR
                session.current_step = str(e)

    def list_agents(self) -> List[Dict]:
        return [{
            "id": s.id,
            "status": s.status.value,
            "progress": s.progress,
            "current_step": s.current_step,
            "created_at": s.created_at
        } for s in self.sessions.values()]

    async def stop_agent(self, session_id: str):
        if session_id in self.tasks:
            self.tasks[session_id].cancel()
            self.sessions[session_id].status = AgentStatus.ERROR
