const NatsClient = require('./natsClient');
const RedisTimeSeriesClient = require('./redisTimeSeriesClient');
const Toggler = require('./toggler');
const { objectsKeysSnakeToCamel } = require('./utils');

class FlagManager {
  constructor({
    stream = 'flags_ruleset',
    server,
    appId,
    sdkKey = '',
    userContext = '',
    redisHost,
    redisPort,
  }) {
    this.natsClient = new NatsClient({
      stream,
      server,
      subject: appId,
      callback: this._setFlags.bind(this),
      sdkKey,
    });
    const redisAddress = `${redisHost}:${redisPort}`;
    this.redisTSClient = new RedisTimeSeriesClient(redisAddress);

    this.flags = [];
    this.userContext = userContext;
  }

  async initializeFlags() {
    await this.natsClient.initializeFlags();
    await this.redisTSClient.init();
  }

  _setFlags(flags) {
    this.flags = objectsKeysSnakeToCamel(flags);
  }

  getFlags() {
    return this.flags;
  }

  async disconnect() {
    await this.natsClient.disconnect();
    await this.redisTSClient.disconnect();
  }

  newToggler(config) {
    const newToggle = new Toggler({
      ...config,
      getFlags: this.getFlags.bind(this),
      userContext: this.userContext,
      emitRedisSignal: this.redisTSClient.emitSignal(),
    });

    return newToggle;
  }
}

const options = {
  url: 'fulladdress',
};

module.exports = FlagManager;
