# VibeCoder

AI‑powered vibe coding platform with multi‑agent orchestration, self‑improvement, deployment to Vercel, GitHub integration, and more.

## Features
- Multi‑agent system (Planner, Coder, Debugger, Reviewer, Deployer)
- Self‑improvement via ChromaDB memory
- One‑click Vercel deployment
- Export as ZIP
- Push to GitHub
- Live preview with Monaco editor

## Setup
1. Clone the repo
2. Backend: `python -m venv venv` then `pip install -r requirements.txt`
3. Frontend: `cd frontend && npm install`
4. Add `.env` with your API keys (see `.env.example`)
5. Run backend: `python run_final.py`
6. Run frontend: `cd frontend && npm run dev`
