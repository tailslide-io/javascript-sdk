const { createClient } = require('redis');
const { TimeSeriesEncoding } = require('@redis/time-series');

class RedisTimeSeriesClient {
  constructor(redisAddress) {
    this.redisAddress = redisAddress || 'http://localhost:6379';
    this.redisClient = null;
  }

  async init() {
    this.redisClient = createClient(this.redisAddress);
    await this.redisClient.connect();
  }

  emitSignal() {
    // binding function that maintains the RedisClient Context whenever we invoke emitRedisSignal
    return this.emitRedisSignal.bind(this);
  }

  async emitRedisSignal(flagId, appId, status) {
    if (!flagId || !status || !appId) return;

    await this.redisClient.ts.add(`${flagId}:${status}`, '*', 1, {
      LABELS: {
        status,
        flagId,
        appId,
      },
    });
  }

  /*
  bucket view of y-axis counts over x-axis tie
  onDuplicate - deals with two hits at the exact time 
  labels -> indexes for queries on Handler end

  `key = 16:failure`
  `time = Date.now()`
  `value = failureCount of flagId`
    `label -> status -> failure/success
    `flagId
    `appId

  `16:failure failureCount`

  `TS.ADD 16:failure Date.now() 1 LABELS type success flagname flag_1`
  */

  async disconnect() {
    await this.redisClient.quit();
  }
}

module.exports = RedisTimeSeriesClient;
