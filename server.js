const WebSocket = require('ws');
const dgram = require('dgram');


const wss = new WebSocket.Server({ port: 8080 });


const clients = new Map();


function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}


function sendMessageToClient(client, data) {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
    }
}


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
                    ws.send(JSON.stringify({ type: 'roomList', rooms: rooms }));
                    break;
                case 'joinRoom':
                    const client = clients.get(ws);
                    if (client) {
                        client.room = parsedMessage.room;
                        ws.send(JSON.stringify({ type: 'roomJoined', room: parsedMessage.room }));
                        
                        sendMessageToClient(ws, { type: 'welcome', message: `Welcome to ${parsedMessage.room}, ${client.name}!` });
                    }
                    break;
                case 'chatMessage':
                    const sender = clients.get(ws);
                    if (sender) {
                        broadcast({ type: 'chatMessage', name: sender.name, message: parsedMessage.message });
                    }
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

    
    sendMessageToClient(ws, { type: 'serverMessage', message: 'Welcome to the server!' });
});


const udpSocket = dgram.createSocket('udp4');


udpSocket.on('message', (msg, rinfo) => {
    console.log(`UDP message received from ${rinfo.address}:${rinfo.port} - ${msg}`);
});

udpSocket.on('listening', () => {
    const address = udpSocket.address();
    console.log(`UDP socket listening on ${address.address}:${address.port}`);
});

udpSocket.on('error', (error) => {
    console.error(`UDP socket error: ${error}`);
    udpSocket.close();
});

udpSocket.on('close', () => {
    console.log('UDP socket closed');
});

// Bind UDP socket to a port
udpSocket.bind(41234);

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
sendUdpMessage('Hello UDP server', 41234, 'localhost');

console.log('WebSocket server started on port 8080');
