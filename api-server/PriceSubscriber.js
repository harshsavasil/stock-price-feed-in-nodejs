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
		const callback = (channel, message) => this.processMessage(req, res, message);
		this.redisSubscriber.on('message', callback);
		this.logActiveListeners(req.logger, 'create');

		req.on('close', () => this.removeListener(req, callback, 'close'));
		req.on('error', () => this.removeListener(req, callback, 'error'));
		req.on('end', () => this.removeListener(req, callback, 'end'));
	}

	removeListener(req, callback, eventType) {
		this.redisSubscriber.removeListener('message', callback);
		this.logActiveListeners(req.logger, eventType);
	}

	processMessage(req, res, messageStr) {
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

	logActiveListeners(logger, eventType) {
		const listenerStats = {
			channel: this.channel,
			count: this.redisSubscriber.listenerCount('message'),
			eventType,
		};
		console.log(listenerStats, 'Stock price feed listener stats');
	}
}

module.exports = PriceSubscriber;
