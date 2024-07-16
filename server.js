const WebSocket = require('ws');
const http = require('http');

// Set the maximum payload size to 10 MB (you can adjust this value as needed)
const server = http.createServer();
const wss = new WebSocket.Server({ server, maxPayload: 10 * 1024 * 1024 });

const clients = new Map();
const rooms = new Set(); // Use a Set to store unique room names

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);
        let parsedMessage;

        try {
            parsedMessage = JSON.parse(message);
        } catch (error) {
            console.error('Failed to parse message as JSON:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            return;
        }

        switch (parsedMessage.type) {
            case 'setName':
                clients.set(ws, { name: parsedMessage.name, room: null });
                sendUserList();
                ws.send(JSON.stringify({ type: 'nameAcknowledged' }));
                break;
            case 'createrooms':
                createrooms(ws, parsedMessage.roomName);
                break;
            case 'getRooms':
                sendRoomList(ws);
                break;
            case 'joinRoom':
                joinRoom(ws, parsedMessage.room);
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

function sendUserList() {
    const users = Array.from(clients.values()).map((info) => info.name);
    broadcast({ type: 'userList', users });
}

function sendRoomList(ws = null) {
    const message = JSON.stringify({ type: 'roomList', rooms: Array.from(rooms) });

    if (ws) {
        ws.send(message);
    } else {
        broadcast({ type: 'roomList', rooms: Array.from(rooms) });
    }
}

function broadcast(data) {
    const message = JSON.stringify(data);
    for (const client of clients.keys()) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message, (error) => {
                if (error) {
                    console.error('Send error:', error);
                }
            });
        }
    }
}

function broadcastToRoom(room, data) {
    const message = JSON.stringify(data);
    for (const [client, info] of clients.entries()) {
        if (info.room === room && client.readyState === WebSocket.OPEN) {
            client.send(message, (error) => {
                if (error) {
                    console.error('Send error:', error);
                }
            });
        }
    }
}

function createrooms(ws, roomName) {
    if (rooms.has(roomName)) {
        ws.send(JSON.stringify({ type: 'error', message: `Room ${roomName} already exists` }));
        return;
    }

    rooms.add(roomName);
    ws.send(JSON.stringify({ type: 'roomCreated', roomName }));
    sendRoomList();
}

function joinRoom(ws, roomName) {
    if (rooms.has(roomName)) {
        clients.get(ws).room = roomName;
        ws.send(JSON.stringify({ type: 'roomJoined', room: roomName }));
        sendRoomList();
    } else {
        ws.send(JSON.stringify({ type: 'error', message: `Room ${roomName} does not exist` }));
    }
}

server.listen(8080, () => {
    console.log('Server is listening on http://localhost:8080');
});
