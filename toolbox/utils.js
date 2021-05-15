/**
 * Creates server sent event in valid format
 * @param {Number} id Event Id
 * @param {String} event Event Name or Type
 * @param {String} data Event data string
 * @param {Number} retry Retry interval in ms
 */
const createEventMessage = (id, event, data, retry) => {
	let sse = id ? `id: ${id}\n` : '';
	sse = event ? sse.concat(`event: ${event}\n`) : sse;
	sse = retry ? sse.concat(`retry: ${retry}\n`) : sse;
	sse = data ? sse.concat(`data: ${data}\n`) : sse;
	sse = sse.concat('\n');
	return sse;
};

/**
 * This method returns the name of the redis channel on which new prices
 * are being published.
 * @param {String} symbol Stock Price Symbol
 */
const getChannelName = (symbol) => {
	return `price_feed:${symbol}`;
};

module.exports = {
	createEventMessage,
	getChannelName,
};