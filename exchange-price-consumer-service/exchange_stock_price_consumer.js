const WebSocket = require('ws');
const socket = new WebSocket('wss://ws.finnhub.io?token=c2fe6uaad3ien4445c20');

const symbols = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT'];
socket.on('open', () => {
	symbols.forEach((symbol) => {
		socket.send(JSON.stringify({'type':'subscribe', 'symbol': symbol}));
	});
});

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


// setTimeout(() => {
// 	process.exit(1); // death by random timeout
// }, Math.random() * 100000);