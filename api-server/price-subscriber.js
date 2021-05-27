const { Cache, Utils } = require('../toolbox');
const { createEventMessage } = Utils;

class PriceSubscriber {
	constructor(symbol) {
		this.symbol = symbol;
		this.channel = Utils.getChannelName(symbol);
		this.redisSubscriber = null;
	}

	start() {
		return Cache.subscribe(this.channel)
			.then((response) => {
				this.redisSubscriber = response;
				this.redisSubscriber.setMaxListeners(0);
			});
	}

	subscribe(req, res) {
		const callback = (channel, message) => this.processMessage(res, message);
		this.redisSubscriber.on('message', callback);
		this.logActiveListeners('create');

		req.on('close', () => this.removeListener(callback, 'close'));
		req.on('error', () => this.removeListener(callback, 'error'));
		req.on('end', () => this.removeListener(callback, 'end'));
	}

	removeListener(callback, eventType) {
		this.redisSubscriber.removeListener('message', callback);
		this.logActiveListeners(eventType);
	}

	processMessage(res, messageStr) {
		try {
			global.totalPricesServed += 1;
			const message = JSON.parse(messageStr);
			message.apiServerLatency = (new Date()).valueOf() - message.exchangePriceConsumerTimestamp;
			global.sumOfTotalAPIServerLatency += message.apiServerLatency;
			const event = createEventMessage(message.id, this.channel, JSON.stringify(message), 30000);
			if (res.connection && !res.connection.destroyed) {
				const written = res.write(event);
				if (!written) {
					res.end();
				}
			}
		} catch (err) {
			console.error(err, `Failed to send ${this.channel} update`);
		}
	}

	logActiveListeners(eventType) {
		const listenerStats = {
			channel: this.channel,
			count: this.redisSubscriber.listenerCount('message'),
			eventType,
		};
		console.log(listenerStats, 'Stock price feed listener stats');
	}
}

module.exports = PriceSubscriber;
