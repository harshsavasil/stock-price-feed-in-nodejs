const WebSocket = require('ws');
const Q = require('q');

const config = require('./config');
const Toolbox = require('../toolbox');

const { Cache } = Toolbox;

const cacheInstance = new Cache({
	host: config.redisCache.host,
	port: config.redisCache.port,
});
const socket = new WebSocket('wss://ws.finnhub.io?token=c2fe6uaad3ien4445c20');
const symbols = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT'];

function publishNewpriceOnRedisChannel(newPrice) {
	const channelName = `price_feed:${newPrice.symbol}`;
	return cacheInstance.publish(channelName, newPrice);
}

function parseMessage(message) {
	try {
		const jsonMessage = JSON.parse(message);
		return jsonMessage.data;
	} catch(err) {
		console.error(err, 'Invalid JSON Message From Exchange');
		return [];
	}
}

socket.on('open', () => {
	symbols.forEach((symbol) => {
		socket.send(JSON.stringify({'type':'subscribe', 'symbol': symbol}));
	});
});

socket.on('message', (message) => {
	const recentTrades = parseMessage(message);
	recentTrades
		.map((recentTrade) => ({
			symbol: recentTrade.s,
			lastPrice: recentTrade.p,
			timestamp: recentTrade.t,
		}))
		.reduce((promise, recentTrade) => promise.then(() => publishNewpriceOnRedisChannel(recentTrade)), Q());
});

socket.on('error', (err) => {
	console.log(err);
});

socket.on('close', () => {
	symbols.forEach((symbol) => {
		socket.send(JSON.stringify({'type':'unsubscribe','symbol': symbol}));
	});
});