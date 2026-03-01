import socketio
import uuid
from typing import Dict, Set

# Create Socket.IO server
sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode='asgi')
app = socketio.ASGIApp(sio)

# Store active rooms and their clients
rooms: Dict[str, Set[str]] = {}

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def join_room(sid, data):
    room_id = data.get('room_id')
    if not room_id:
        return
    sio.enter_room(sid, room_id)
    if room_id not in rooms:
        rooms[room_id] = set()
    rooms[room_id].add(sid)
    # Send current file state to the new client
    # (You'd need to fetch from project files)
    await sio.emit('room_joined', {'room_id': room_id}, room=sid)

@sio.event
async def code_change(sid, data):
    room_id = data.get('room_id')
    filename = data.get('filename')
    content = data.get('content')
    # Broadcast to all others in the room
    await sio.emit('code_update', {
        'filename': filename,
        'content': content,
        'sender': sid
    }, room=room_id, skip_sid=sid)

@sio.event
async def disconnect(sid):
    # Remove from all rooms
    for room_id, members in rooms.items():
        if sid in members:
            members.remove(sid)
    print(f"Client disconnected: {sid}")
