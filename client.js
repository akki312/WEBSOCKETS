const WebSocket = require('ws');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ws = new WebSocket('ws://localhost:8080');

let name = '';
let currentRoom = '';

// WebSocket event handlers
ws.on('open', handleOpen);
ws.on('message', handleMessage);
ws.on('close', handleClose);
ws.on('error', handleError);

// Handle WebSocket connection open event
function handleOpen() {
    console.log('Connected to WebSocket server');
    askName();
}

// Handle WebSocket message event
function handleMessage(event) {
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
        default:
            console.log('Unknown message type:', data.type);
    }
}

// Handle WebSocket close event
function handleClose() {
    console.log('Disconnected from WebSocket server');
    rl.close();
}

// Handle WebSocket error event
function handleError(error) {
    console.error('WebSocket error:', error);
    rl.close();
}

// Prompt user for their name
function askName() {
    rl.question('Enter your name: ', (answer) => {
        name = answer;
        ws.send(JSON.stringify({ type: 'setName', name }));
        console.log('Waiting for room list...');
    });
}

// Prompt user for the room to join
function askRoom() {
    rl.question('Enter room to join: ', (room) => {
        currentRoom = room;
        ws.send(JSON.stringify({ type: 'joinRoom', room }));
        console.log('Joined room:', room);
        chat();
    });
}

// Chat loop for sending messages
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

// Export WebSocket client methods for external usage if needed
module.exports = {
    handleOpen,
    handleMessage,
    handleClose,
    handleError,
    askName,
    askRoom,
    chat
};
