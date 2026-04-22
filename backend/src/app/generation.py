print("🔧 generation.py module loaded (stub with real file generation)")

import asyncio
import json
import os

async def run_generation(prompt: str, workspace_id: int, websocket):
    print(f"🚀 run_generation called: {prompt[:50]}...")
    try:
        # Send initial status
        await websocket.send_text(json.dumps({"type": "status", "agent": "System", "message": "Starting generation..."}))

        # Simulate planning and coding
        await websocket.send_text(json.dumps({"type": "status", "agent": "Planner", "message": "Planning..."}))
        await asyncio.sleep(1)

        # Generate a proper counter app
        files = [
            {
                "path": "index.html",
                "content": """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Counter App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Counter</h1>
        <div class="counter-display" id="counter">0</div>
        <div class="buttons">
            <button id="decrement">-</button>
            <button id="increment">+</button>
            <button id="reset">Reset</button>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>"""
            },
            {
                "path": "style.css",
                "content": """body {
    font-family: Arial, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
    background-color: #f0f0f0;
}
.container {
    text-align: center;
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
.counter-display {
    font-size: 4rem;
    margin: 1rem 0;
    color: #333;
}
.buttons button {
    font-size: 1.5rem;
    margin: 0 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.3s;
}
#increment {
    background-color: #4CAF50;
    color: white;
}
#decrement {
    background-color: #f44336;
    color: white;
}
#reset {
    background-color: #ff9800;
    color: white;
}
.buttons button:hover {
    opacity: 0.8;
}"""
            },
            {
                "path": "script.js",
                "content": """let count = 0;
const counterDisplay = document.getElementById('counter');
const incrementBtn = document.getElementById('increment');
const decrementBtn = document.getElementById('decrement');
const resetBtn = document.getElementById('reset');

incrementBtn.addEventListener('click', () => {
    count++;
    counterDisplay.textContent = count;
});

decrementBtn.addEventListener('click', () => {
    count--;
    counterDisplay.textContent = count;
});

resetBtn.addEventListener('click', () => {
    count = 0;
    counterDisplay.textContent = count;
});"""
            }
        ]

        # Send each file
        for f in files:
            await websocket.send_text(json.dumps({"type": "file", "path": f["path"], "content": f["content"]}))
            await asyncio.sleep(0.2)  # simulate streaming

        # Send completion
        await websocket.send_text(json.dumps({"type": "done", "message": "Generation complete"}))
        print("✅ Generation complete")

    except Exception as e:
        print(f"❌ Error in generation: {e}")
        await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
