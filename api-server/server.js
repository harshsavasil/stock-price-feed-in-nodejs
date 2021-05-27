const http = require('http');
const Q = require('q');

const port = process.env.PORT || 3000;
const config = require('../config');
const Toolbox = require('../toolbox');
Toolbox.init(config);

const PriceSubscriber = require('./price-subscriber');
const { symbols } = config;

global.totalPricesServed = 0;
global.sumOfTotalAPIServerLatency = 0;

const logAverageLatency = () => {
	return setInterval(() => {
		console.log(`Average Latency: ${global.sumOfTotalAPIServerLatency/global.totalPricesServed}`);
	}, 5000);
};

const priceFeedChannels = symbols.map((symbol) => new PriceSubscriber(symbol));
return Q.all([
	Q.all(priceFeedChannels.map((priceFeedChannel) => priceFeedChannel.start())),
	logAverageLatency(),
])
	.then(() => {
		const server = http.createServer((req, res) => {
			// Server-sent events endpoint
			if (req.url === '/events') {
				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive',
				});
				try {
					priceFeedChannels.forEach((priceFeedChannel) => priceFeedChannel.subscribe(req, res));
				} catch (error) {
					console.error(error, 'Error while subscribing for server sent events');
					res.end();
				}
			}
		});        
		server.listen(port);
        
		server.on('error', (err) => {
			console.log(err);
			process.exit(1);
		});
        
		server.on('listening', () => {
			console.log(`Listening on port ${port}`);
		});
	});