import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import uvicorn

if __name__ == "__main__":
    try:
        port = int(os.environ.get("PORT", 8000))
        uvicorn.run(
            "backend.src.main:app",
            host="0.0.0.0",
            port=port,
            reload=False,
            workers=1
        )
    except Exception as e:
        import traceback
        print("CRITICAL ERROR: Unhandled exception")
        traceback.print_exc()
        sys.exit(1)
