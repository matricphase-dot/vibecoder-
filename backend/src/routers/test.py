from fastapi import APIRouter

router = APIRouter(prefix="/api/test", tags=["test"])

@router.get("/error")
async def trigger_error():
    raise Exception("This is a test error for Sentry")
