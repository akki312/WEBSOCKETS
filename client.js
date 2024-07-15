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

    rl.question('Enter the name of the room to create: ', (roomName) => {
        ws.send(JSON.stringify({ type: 'createrooms', roomName: roomName }));
    });

    ws.send(JSON.stringify({ type: 'getRooms' }));

    rl.on('line', (input) => {
        ws.send(JSON.stringify({ type: 'chatMessage', message: input }));
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
            case 'error':
                console.error('Error:', parsedMessage.message);
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
