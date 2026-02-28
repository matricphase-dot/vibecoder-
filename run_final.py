import asyncio
import sys
import os
import traceback

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "D:\\playwright_browsers"

try:
    import uvicorn
except ImportError as e:
    print(f"CRITICAL IMPORT ERROR: {e}")
    print(traceback.format_exc())
    sys.exit(1)

if __name__ == "__main__":
    try:
        port = int(os.getenv("PORT", 10000))
        host = os.getenv("HOST", "0.0.0.0")
        print(f"Starting server on {host}:{port}")
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
