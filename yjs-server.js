const { WebSocketServer } = require('ws');
const Y = require('yjs');
const { setupWebSocket } = require('y-websocket/bin/utils');

const wss = new WebSocketServer({ port: 1234 });
console.log('✅ Yjs WebSocket server running on ws://localhost:1234');

setupWebSocket(wss);
