const redis = require('redis');
const Q = require('q');
const { mapValues, isEmpty } = require('lodash');

const defaultTTL = 24 * 60 * 60; // one day

function parseVal(val) {
    let result;
    if (typeof val !== 'string') {
        return val;
    }
    try {
        result = JSON.parse(val);
    } catch (e) {
        result = val;
    }
    return result;
}

function stringifyObj(obj) {
    let result;
    if (typeof obj === 'string') {
        return obj;
    }
    try {
        result = JSON.stringify(obj);
    } catch (e) {
        result = obj;
    }
    return result;
}

function parseObj(obj) {
    if (!obj || isEmpty(obj)) return obj;
    return mapValues(obj, (item) => parseVal(item));
}

function stringifyObjValues(obj) {
    return mapValues(obj, (item) => stringifyObj(item));
}

class RedisCache {
    constructor(props = {}) {
        if (!props.host || !props.port) {
            throw new Error('host and port are required');
        }
        this.host = props.host;
        this.port = props.port;
        this.cacheClient = null;
        this.cacheClientDeferred = null;
        this.cacheSubscribers = new Map();
    }

    connect() {
        const deferred = Q.defer();

        if (this.cacheClient) {
            deferred.resolve(this.cacheClient);
            return deferred.promise;
        }
        if (this.cacheClientDeferred && this.cacheClientDeferred.promise.inspect().state === 'pending') {
            return this.cacheClientDeferred.promise;
        }
        this.cacheClientDeferred = deferred;

        this.cacheClient = redis.createClient({
            host: this.host,
            port: this.port,
        });
        this.cacheClient.on('connect', deferred.resolve);
        this.cacheClient.on('error', deferred.reject);

        return deferred.promise;
    }

    set(key, value) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.set(key, stringifyObj(value), 'EX', defaultTTL, (error, result) => {
                    if (error) {
                        deferred.reject(error);
                    } else if (result !== 'OK') {
                        deferred.reject(new Error('Error setting value in redis'));
                    } else {
                        deferred.resolve(value);
                    }
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    setWithTTL(key, val, timeInSeconds) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.set(key, stringifyObj(val), 'EX', timeInSeconds, (err, result) => {
                    if (err) {
                        deferred.reject(err);
                    } else if (result !== 'OK') {
                        deferred.reject(new Error('Error setting value in redis'));
                    } else {
                        deferred.resolve(val);
                    }
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    get(key) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.get(key, (error, value) => {
                    if (error) {
                        return deferred.reject(error);
                    }
                    return deferred.resolve(parseVal(value));
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    del(key) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.del(key, (err, count) => {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(count);
                    }
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    mset(object) {
        const promises = [];

        Object.keys(object).forEach((key) => {
            promises.push(this.set(key, object[key]));
        });

        return Q.all(promises);
    }

    sadd(key, value) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.sadd(key, value, (err) => {
                    if (err) {
                        return deferred.reject(err);
                    }
                    return deferred.resolve(value);
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    sismember(key, member) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.sismember(key, member, (err, value) => {
                    if (err) {
                        return deferred.reject(err);
                    }
                    if (value === 0) {
                        return deferred.resolve(false);
                    }
                    return deferred.resolve(true);
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    hmset(key, obj) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.hmset(key, stringifyObjValues(obj), (err, value) => {
                    if (err) {
                        return deferred.reject(err);
                    }
                    return deferred.resolve(value);
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    hget(key, item) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.hget(key, item, (err, value) => {
                    if (err) {
                        return deferred.reject(err);
                    }
                    return deferred.resolve(parseVal(value));
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    hgetAll(key) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.hgetall(key, (err, value) => {
                    if (err) {
                        return deferred.reject(err);
                    }
                    return deferred.resolve(parseObj(value));
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    hdel(key, item) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.hdel(key, item, (err, value) => {
                    if (err) return deferred.reject(err);
                    return deferred.resolve(value);
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    incrementForKey(key) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.incr(key, (err, result) => {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(result);
                    }
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    expire(key, timeInSeconds) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.expire(key, timeInSeconds, (err) => {
                    if (err) {
                        return deferred.reject(err);
                    }
                    return deferred.resolve();
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    publish(channel, value) {
        const deferred = Q.defer();

        this.connect()
            .then(() => {
                this.cacheClient.publish(channel, stringifyObj(value), (error) => {
                    if (error) {
                        deferred.reject(error);
                    } else {
                        deferred.resolve(value);
                    }
                });
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    subscribe(channel) {
        const deferred = Q.defer();

        if (this.cacheSubscribers.has(channel)) {
            const subscriber = this.cacheSubscribers.get(channel);
            deferred.resolve(subscriber);
        } else {
            this.connect()
                .then(() => {
                    const subscriber = this.cacheClient.duplicate();
                    subscriber.on('error', deferred.reject);
                    subscriber.on('subscribe', (channelName) => {
                        this.cacheSubscribers.set(channelName, subscriber);
                        deferred.resolve(subscriber);
                    });
                    subscriber.subscribe(channel);
                })
                .catch(deferred.reject);
        }

        return deferred.promise;
    }

    unsubscribe(channel) {
        const deferred = Q.defer();

        if (this.cacheSubscribers.has(channel)) {
            const client = this.cacheSubscribers.get(channel);
            client.unsubscribe(channel, (err) => {
                if (err) {
                    deferred.reject(err);
                } else {
                    this.cacheSubscribers.delete(channel);
                    deferred.resolve(client);
                }
            })
                .catch(deferred.reject);
        } else {
            deferred.resolve();
        }

        return deferred.promise;
    }
}

module.exports = RedisCache;
