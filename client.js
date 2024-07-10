// client.js
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
            askRoom();
            break;
        case 'chatMessage':
            console.log(`${data.name}: ${data.message}`);
            break;
        default:
            console.log('Unknown message type:', data.type);
    }
});

ws.on('close', () => {
    console.log('Disconnected from WebSocket server');
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

function askName() {
    rl.question('Enter your name: ', (answer) => {
        name = answer;
        ws.send(JSON.stringify({ type: 'setName', name }));
    });
}

function askRoom() {
    rl.question('Enter room to join: ', (room) => {
        currentRoom = room;
        ws.send(JSON.stringify({ type: 'joinRoom', room }));
        chat();
    });
}

function chat() {
    rl.question('Enter message: ', (message) => {
        if (message === '/exit') {
            ws.close();
            rl.close();
            return;
        }
        ws.send(JSON.stringify({ type: 'chatMessage', message }));
        chat();
    });
}
