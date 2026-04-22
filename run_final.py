import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
