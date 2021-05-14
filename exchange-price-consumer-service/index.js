const WebSocket = require('ws');

const socket = new WebSocket('wss://ws.finnhub.io?token=c2fe6uaad3ien4445c20');


const symbols = ['BINANCE:BTCUSDT'];

// Connection opened -> Subscribe to Quotes
socket.on('open', () => {
    symbols.forEach((symbol) => {
        socket.send(JSON.stringify({'type':'subscribe', 'symbol': symbol}));
    });
});

// Listen for messages
socket.on('message', (message) => {
    console.log('Message from server ', message);
});

socket.on('error', (err) => {
    console.log(err);
});

socket.on('close', () => {
    symbols.forEach((symbol) => {
        socket.send(JSON.stringify({'type':'unsubscribe','symbol': symbol}));
    });
});
