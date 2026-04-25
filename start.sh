#!/bin/bash
# Start backend in background
cd /app/backend
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 &
# Start nginx (frontend)
nginx -g "daemon off;"
