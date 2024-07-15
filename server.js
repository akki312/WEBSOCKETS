const WebSocket = require('ws');
const http = require('http');

// HTTP server setup
const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Map();

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
                createrooms(parsedMessage.roomName);
                break;
            case 'getRooms':
                sendRoomList(ws);
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

function sendUserList() {
    const users = Array.from(clients.values()).map((info) => info.name);
    broadcast({ type: 'userList', users });
}

function sendRoomList(ws = null) {
    const rooms = Array.from(new Set(Array.from(clients.values()).map((info) => info.room)));
    const message = JSON.stringify({ type: 'roomList', rooms: rooms.filter((room) => room !== null) });

    if (ws) {
        ws.send(message);
    } else {
        broadcast({ type: 'roomList', rooms: rooms.filter((room) => room !== null) });
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

function createrooms(roomName) {
    // Check if the room already exists
    const rooms = Array.from(new Set(Array.from(clients.values()).map((info) => info.room)));
    if (rooms.includes(roomName)) {
        console.log(`Room ${roomName} already exists`);
        return;
    }

    // If the room doesn't exist, create it
    // To "create" a room, we just need to ensure at least one client joins it
    // Here we assume rooms are created when a client joins or names it
    
    // This example function simply triggers an update to all clients
    // In practice, you would have more logic here to handle room creation
    broadcast({ type: 'roomCreated', roomName });
    sendRoomList();
}

server.listen(8080, () => {
    console.log('Server is listening on http://localhost:8080');
});
