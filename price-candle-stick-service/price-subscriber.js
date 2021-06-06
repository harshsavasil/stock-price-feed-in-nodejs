const { Cache, Utils } = require('../toolbox');

class PriceSubscriber {
	constructor(symbol) {
		this.symbol = symbol;
		this.channel = Utils.getChannelName(symbol);
		this.previousPrice = null;
		this.redisSubscriber = null;
	}

	start() {
		return Cache.subscribe(this.channel)
			.then((response) => {
				this.redisSubscriber = response;
			});
	}

	subscribe() {
		const callback = (channel, message) => this.processMessage(message);
		this.redisSubscriber.on('message', callback);
	}

	processMessage(messageStr) {
		const newPrice = JSON.parse(messageStr);
		if (this.previousPrice) {
			if (newPrice.originTimestamp < this.previousPrice.originTimestamp) {
				console.error({ previousPrice: this.previousPrice, newPrice }, 'Discarding Old Price');
			} else {
				setImmediate(() => {
					this.updateCandleSticks(newPrice);
				});
			}
		} else {
			this.updateCandleSticks(newPrice);
		}
	}

	updateCandleSticks(newPrice) {
		console.log(newPrice);
		this.previousPrice = newPrice;
	}
}

module.exports = PriceSubscriber;
