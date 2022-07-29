const { createClient } = require('redis');

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

  async disconnect() {
    await this.redisClient.quit();
  }
}

module.exports = RedisTimeSeriesClient;
