const crypto = require('crypto');
const WebSocket = require('ws');

const config = require('../config');
const Toolbox = require('../toolbox');
Toolbox.init(config);

const { Cache, Utils } = Toolbox;
const { binance } = config;

const socket = new WebSocket(`${binance.uri}/ws/stream`);

const publishNewpriceOnRedisChannel = (newPrice) => {
	const channelName = Utils.getChannelName(newPrice.symbol.toLowerCase());
	return Cache.publish(channelName, newPrice);
};

const isValidPriceTick = (message) => {
	try {
		const jsonMessage = JSON.parse(message);
		const eventType = jsonMessage.e;
		return eventType === '24hrTicker' || eventType === '24hrMiniTicker';
	} catch(err) {
		console.error(err, 'Invalid JSON Message From Exchange');
		return false;
	}
};

socket.on('open', () => {
	socket.send(JSON.stringify({
		method: 'SUBSCRIBE',
		params: binance.symbols.map((symbol) => `${symbol}@ticker`),
		id: 1
	}));
});

socket.on('message', (message) => {
	setImmediate(() => {
		if (isValidPriceTick(message)) {
			const priceTickReceieved = JSON.parse(message);
			let priceTick;
			if (priceTickReceieved.e === '24hrTicker') {
				priceTick = {
					id: crypto.randomBytes(16).toString('hex'),
					symbol: priceTickReceieved.s,
					lastPrice: priceTickReceieved.c,
					openTimestamp: priceTickReceieved.O,
					closeTimestamp: priceTickReceieved.C,
					rawPrice: priceTickReceieved,
				};
				console.log(priceTickReceieved, 'Ticker');
			} else if (priceTickReceieved.e === '24hrMiniTicker') {
				priceTick = {
					id: crypto.randomBytes(16).toString('hex'),
					symbol: priceTickReceieved.s,
					lastPrice: priceTickReceieved.c,
					timestamp: new Date(priceTickReceieved.E),
					rawPrice: priceTickReceieved,
				};
				console.log(priceTickReceieved, 'Mini Ticker');
			}
			return publishNewpriceOnRedisChannel(priceTick);
		} else {
			console.log(message);
		}
	});
});

// socket.on('ping', () => {
// 	socket.pong(Buffer.from((new Date()).valueOf().toString()));
// });

socket.on('error', (err) => {
	console.log(err);
});

socket.on('close', () => {
	socket.send(JSON.stringify({
		method: 'UNSUBSCRIBE',
		params: binance.symbols.map((symbol) => `${symbol}@ticker`),
		id: 1
	}));
	process.exit(1);
});