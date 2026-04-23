# backend/src/enterprise/middleware.py
import os
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import httpx

# Global flag: true = block all outbound except localhost
ENTERPRISE_MODE = os.getenv("ENTERPRISE_MODE", "false").lower() == "true"

class NetworkIsolationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if ENTERPRISE_MODE:
            # Block any outgoing HTTP requests (except to local Ollama)
            # We'll intercept the request's internal client if needed.
            # For simplicity, we rely on the model router to respect ENTERPRISE_MODE.
            pass
        response = await call_next(request)
        return response

def is_enterprise_mode() -> bool:
    return ENTERPRISE_MODE
