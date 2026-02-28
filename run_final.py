import asyncio
import sys
import os
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "D:\\playwright_browsers"

import uvicorn

if __name__ == "__main__":
    # Get the PORT from environment (Render sets this) or default to 10000
    port = int(os.getenv("PORT", 10000))
    # Bind to 0.0.0.0 to accept external connections
    host = os.getenv("HOST", "0.0.0.0")

    uvicorn.run(
        "backend.src.main:app",
        host=host,
        port=port,
        reload=False,          # Disable reload in production
        workers=1
    )
