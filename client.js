const WebSocket = require('ws');
const readline = require('readline');

// Connect to the WebSocket server
const ws = new WebSocket('ws://localhost:8080');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

ws.on('open', () => {
    console.log('Connected to WebSocket server');

    rl.question('Enter your name: ', (name) => {
        ws.send(JSON.stringify({ type: 'setName', name: name }));
    });
});

ws.on('message', (message) => {
    console.log(`Raw message received: ${message}`);
    try {
        const parsedMessage = JSON.parse(message);
        console.log('Parsed message:', parsedMessage);

        switch (parsedMessage.type) {
            case 'userList':
                console.log('User list:', parsedMessage.users);
                break;
            case 'roomList':
                console.log('Room list:', parsedMessage.rooms);
                break;
            case 'chatMessage':
                console.log(`${parsedMessage.name}: ${parsedMessage.message}`);
                break;
            case 'nameAcknowledged':
                console.log('Name set successfully.');
                // Request the room list after setting the name is acknowledged
                ws.send(JSON.stringify({ type: 'getRooms' }));
                break;
            default:
                console.log('Unknown message type:', parsedMessage.type);
        }
    } catch (error) {
        console.error('Failed to parse message as JSON:', error);
    }
});

ws.on('close', () => {
    console.log('Disconnected from WebSocket server');
});

ws.on('error', (error) => {
    console.error(`WebSocket error: ${error}`);
});
