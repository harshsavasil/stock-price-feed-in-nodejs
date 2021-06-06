const config = require('../config');
const Toolbox = require('../toolbox');
Toolbox.init(config);

const PriceSubscriber = require('./price-subscriber');
const { symbols } = config;

const priceFeedChannels = symbols.map((symbol) => new PriceSubscriber(symbol));

return Promise.all(priceFeedChannels.map((priceFeedChannel) => priceFeedChannel.start()))
	.then(() => priceFeedChannels.forEach((priceFeedChannel) => priceFeedChannel.subscribe()));