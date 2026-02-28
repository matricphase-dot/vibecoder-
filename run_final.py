import asyncio
import sys
import os
import traceback

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "D:\\playwright_browsers"

import uvicorn

if __name__ == "__main__":
    try:
        # Get the PORT from environment (Render sets this) or default to 10000
        port = int(os.getenv("PORT", 10000))
        # Bind to 0.0.0.0 to accept external connections
        host = os.getenv("HOST", "0.0.0.0")

        print(f"Starting server on {host}:{port}")
        print(f"Environment PORT value: {os.getenv('PORT', 'not set')}")

        uvicorn.run(
            "backend.src.main:app",
            host=host,
            port=port,
            reload=False,
            workers=1
        )
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        print(traceback.format_exc())
        sys.exit(1)
