const { WebSocketServer } = require('ws');
const Y = require('yjs');
const { encoding, decoding } = require('lib0');
const { Awareness } = require('y-protocols/awareness');

const wss = new WebSocketServer({ port: 1234 });
console.log('✅ Yjs collaborative server running on ws://localhost:1234');

const docs = new Map();

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const docName = url.pathname.slice(1);
    if (!docName) {
        ws.close();
        return;
    }

    if (!docs.has(docName)) {
        docs.set(docName, new Y.Doc());
    }
    const doc = docs.get(docName);
    const awareness = new Awareness(doc);

    // Send initial sync
    const encoder = encoding.createEncoder();
    Y.encodeStateVector(encoder, doc);
    const initialSync = encoding.toUint8Array(encoder);
    ws.send(Buffer.from(initialSync));

    ws.on('message', (data) => {
        const message = new Uint8Array(data);
        if (message[0] === 0) { // Yjs sync message
            Y.applyUpdate(doc, message.slice(1));
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === 1) {
                    client.send(data);
                }
            });
        } else if (message[0] === 1) {
            // Awareness update (optional broadcast)
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === 1) {
                    client.send(data);
                }
            });
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected from ${docName}`);
    });
});
