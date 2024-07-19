const WebSocket = require('ws');
const dgram = require('dgram');

// Create a WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

// Map to store client connections and their associated information
const clients = new Map();

// Function to broadcast a message to all connected WebSocket clients
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Function to send a message to a specific WebSocket client
function sendMessageToClient(client, data) {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
    } else {
        console.error('Client is not open:', client.readyState);
    }
}

// WebSocket server event handlers
wss.on('connection', (ws) => {
    console.log('A new client connected');

    ws.on('message', (message) => {
        console.log(`Raw message received from client: ${message}`);
        try {
            const parsedMessage = JSON.parse(message);
            console.log('Parsed message from client:', parsedMessage);

            switch (parsedMessage.type) {
                case 'setName':
                    clients.set(ws, { name: parsedMessage.name });
                    broadcast({ type: 'userList', users: Array.from(clients.values()).map(client => client.name) });
                    break;
                case 'getRooms':
                    const rooms = ['room1', 'room2', 'room3'];
                    sendMessageToClient(ws, { type: 'roomList', rooms: rooms });
                    break;
                case 'joinRoom':
                    const client = clients.get(ws);
                    if (client) {
                        client.room = parsedMessage.room;
                        sendMessageToClient(ws, { type: 'roomJoined', room: parsedMessage.room });
                        sendMessageToClient(ws, { type: 'welcome', message: `Welcome to ${parsedMessage.room}, ${client.name}!` });
                    }
                    break;
                case 'chatMessage':
                    const sender = clients.get(ws);
                    if (sender) {
                        broadcast({ type: 'chatMessage', name: sender.name, message: parsedMessage.message });
                    }
                    break;
                case 'exit':
                    ws.close();
                    break;
                default:
                    console.log('Unknown message type from client:', parsedMessage.type);
            }
        } catch (error) {
            console.error('Failed to parse message from client as JSON:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
        broadcast({ type: 'userList', users: Array.from(clients.values()).map(client => client.name) });
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error: ${error}`);
    });

    // Send a welcome message to the newly connected client
    sendMessageToClient(ws, { type: 'serverMessage', message: 'Welcome to the server!' });
});

// Create a UDP socket
const udpSocket = dgram.createSocket('udp4');

// UDP multicast group and port
const MULTICAST_GROUP = '239.255.255.250';
const MULTICAST_PORT = 41234;

// UDP socket event handlers
udpSocket.on('message', (msg, rinfo) => {
    console.log(`UDP message received from ${rinfo.address}:${rinfo.port} - ${msg}`);
});

udpSocket.on('listening', () => {
    const address = udpSocket.address();
    console.log(`UDP socket listening on ${address.address}:${address.port}`);

    // Join the multicast group
    udpSocket.addMembership(MULTICAST_GROUP);

    // Enable multicast loopback
    udpSocket.setMulticastLoopback(true);
});

udpSocket.on('error', (error) => {
    console.error(`UDP socket error: ${error}`);
    udpSocket.close();
});

udpSocket.on('close', () => {
    console.log('UDP socket closed');
});

// Bind UDP socket to a port
udpSocket.bind(MULTICAST_PORT);

// Function to send UDP messages
function sendUdpMessage(message, port, address) {
    udpSocket.send(message, port, address, (error) => {
        if (error) {
            console.error(`UDP message send error: ${error}`);
        } else {
            console.log(`UDP message sent to ${address}:${port}`);
        }
    });
}

// Example of sending a UDP message
sendUdpMessage('Hello UDP server', MULTICAST_PORT, MULTICAST_GROUP);

console.log('WebSocket server started on port 8080');
