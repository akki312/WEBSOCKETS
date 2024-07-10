// server.js
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Map();

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);

        switch (parsedMessage.type) {
            case 'setName':
                clients.set(ws, { name: parsedMessage.name, room: null });
                sendUserList();
                break;
            case 'joinRoom':
                clients.get(ws).room = parsedMessage.room;
                sendRoomList();
                break;
            case 'chatMessage':
                broadcastToRoom(clients.get(ws).room, {
                    type: 'chatMessage',
                    name: clients.get(ws).name,
                    message: parsedMessage.message,
                });
                break;
            default:
                console.log('Unknown message type:', parsedMessage.type);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
        sendUserList();
        sendRoomList();
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function broadcastToRoom(room, data) {
    const message = JSON.stringify(data);
    for (const [client, info] of clients.entries()) {
        if (info.room === room && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

function sendUserList() {
    const users = Array.from(clients.values()).map((info) => info.name);
    broadcast({ type: 'userList', users });
}

function sendRoomList() {
    const rooms = Array.from(new Set(Array.from(clients.values()).map((info) => info.room)));
    broadcast({ type: 'roomList', rooms: rooms.filter((room) => room !== null) });
}

function broadcast(data) {
    const message = JSON.stringify(data);
    for (const client of clients.keys()) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

server.listen(8080, () => {
    console.log('Server is listening on http://localhost:8080');
});
