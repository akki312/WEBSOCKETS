const WebSocket = require('ws');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ws = new WebSocket('ws://localhost:8080');

let name = '';
let currentRoom = '';

ws.on('open', () => {
    console.log('Connected to WebSocket server');
    askName();
});

ws.on('message', (event) => {
    const data = JSON.parse(event);
    switch (data.type) {
        case 'userList':
            console.log('Connected users:', data.users.join(', '));
            break;
        case 'roomList':
            console.log('Available rooms:', data.rooms.join(', '));
            if (!currentRoom) {
                askRoom();
            }
            break;
        case 'chatMessage':
            console.log(`${data.name}: ${data.message}`);
            break;
        case 'udpMessage':
            console.log(`UDP Message: ${data.message}`);
            break;
        default:
            console.log('Unknown message type:', data.type);
    }
});

ws.on('close', () => {
    console.log('Disconnected from WebSocket server');
    rl.close();
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    rl.close();
});

function askName() {
    rl.question('Enter your name: ', (answer) => {
        name = answer;
        ws.send(JSON.stringify({ type: 'setName', name }));
        console.log('Waiting for room list...');
    });
}

function askRoom() {
    rl.question('Enter room to join: ', (room) => {
        currentRoom = room;
        ws.send(JSON.stringify({ type: 'joinRoom', room }));
        console.log('Joined room:', room);
        chat();
    });
}

function chat() {
    rl.question('Enter message: ', (message) => {
        if (message === '/exit') {
            ws.close();
            return;
        }
        ws.send(JSON.stringify({ type: 'chatMessage', message }));
        chat();
    });
}
