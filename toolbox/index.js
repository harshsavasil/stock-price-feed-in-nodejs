const RedisCache = require('./redis-wrapper');
const Utils = require('./utils');

const Toolbox = {
	Utils,
};

Toolbox.init = (config) => {
	if (config.redisCache) {
		Toolbox.Cache = new RedisCache({
			host: config.redisCache.host,
			port: config.redisCache.port,
		});
	}
};

module.exports = Toolbox;
