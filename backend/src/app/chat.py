async def handle_chat_message(message, websocket):
    await websocket.send_text('{"type":"chat","answer":"Chat not implemented yet"}')
