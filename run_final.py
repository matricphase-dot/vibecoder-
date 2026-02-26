import asyncio
import sys
import os
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # Set environment variable to help Playwright
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "D:\\playwright_browsers"

import uvicorn

if __name__ == "__main__":
    uvicorn.run("backend.src.main:app", host="0.0.0.0", port=8000, reload=False)
