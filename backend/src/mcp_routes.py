from fastapi import APIRouter

router = APIRouter(prefix="/mcp", tags=["mcp"])

@router.get("/servers")
async def mcp_servers():
    return []

@router.get("/tools")
async def mcp_tools():
    return []

@router.post("/register")
async def mcp_register():
    return {"ok": True}

@router.post("/call")
async def mcp_call():
    return {"result": "not implemented"}
