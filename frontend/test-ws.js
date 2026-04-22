const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8000/ws/123');
ws.on('open', () => {
    console.log('✅ Connected to backend');
    ws.send(JSON.stringify({type: 'ping'}));
});
ws.on('message', (data) => {
    console.log('📨 Received:', data.toString());
    ws.close();
});
ws.on('error', (err) => {
    console.error('❌ Error:', err.message);
});
ws.on('close', () => {
    console.log('🔌 Connection closed');
});
