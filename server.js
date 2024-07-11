const WebSocket = require('ws');
const http = require('http');
const dgram = require('dgram');

// HTTP server setup
const server = http.createServer();
const wss = new WebSocket.Server({ server });
const udpServer = dgram.createSocket('udp4');

const clients = new Map();

// UDP server event handling
udpServer.on('error', (err) => {
    console.error(`UDP server error:\n${err.stack}`);
    udpServer.close();
});

udpServer.on('message', (msg, rinfo) => {
    console.log(`UDP server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
    broadcast({ type: 'udpMessage', message: msg.toString() });
});

udpServer.on('listening', () => {
    const address = udpServer.address();
    console.log(`UDP server listening on ${address.address}:${address.port}`);
});

udpServer.bind(41234);

// WebSocket server event handling
wss.on('connection', (ws) => {
    console.log('New client connected');
    logBufferSize(ws);

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

    ws.on('drain', () => {
        console.log('Socket buffer drained');
        logBufferSize(ws);
    });
});

// Helper functions
function logBufferSize(ws) {
    console.log(`Socket buffer size: ${ws.bufferedAmount}`);
}

function broadcastToRoom(room, data) {
    const message = JSON.stringify(data);
    for (const [client, info] of clients.entries()) {
        if (info.room === room && client.readyState === WebSocket.OPEN) {
            client.send(message, (error) => {
                if (error) {
                    console.error('Send error:', error);
                } else {
                    logBufferSize(client);
                }
            });
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
            client.send(message, (error) => {
                if (error) {
                    console.error('Send error:', error);
                } else {
                    logBufferSize(client);
                }
            });
        }
    }
}

// Start the HTTP server
server.listen(8080, () => {
    console.log('Server is listening on http://localhost:8080');
});
