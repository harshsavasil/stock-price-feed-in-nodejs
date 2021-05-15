const crypto = require('crypto');
const Q = require('q');
const WebSocket = require('ws');

const config = require('../config');
const Toolbox = require('../toolbox');
Toolbox.init(config);

const { Cache, Utils } = Toolbox;
const { finnhub, symbols } = config;

const socket = new WebSocket(finnhub.uri);

const publishNewpriceOnRedisChannel = (newPrice) => {
	const channelName = Utils.getChannelName(newPrice.symbol);
	return Cache.publish(channelName, newPrice);
};

const parseMessage = (message) => {
	try {
		const jsonMessage = JSON.parse(message);
		if (jsonMessage.type === 'trade' && Array.isArray(jsonMessage.data)) {
			return jsonMessage.data;
		}
		return [];
	} catch(err) {
		console.error(err, 'Invalid JSON Message From Exchange');
		return [];
	}
};

socket.on('open', () => {
	symbols.forEach((symbol) => {
		socket.send(JSON.stringify({'type':'subscribe', 'symbol': symbol}));
	});
});

socket.on('message', (message) => {
	const exchangePriceConsumerTimestamp = (new Date()).valueOf();
	const recentTrades = parseMessage(message);
	recentTrades
		.map((recentTrade) => ({
			id: crypto.randomBytes(16).toString('hex'),
			symbol: recentTrade.s,
			lastPrice: recentTrade.p,
			originTimestamp: recentTrade.t,
			exchangePriceConsumerTimestamp,
			exchangePriceConsumerLatency: exchangePriceConsumerTimestamp - recentTrade.t,
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