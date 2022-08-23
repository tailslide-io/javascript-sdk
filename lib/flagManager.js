const NatsClient = require('./natsClient');
const RedisTimeSeriesClient = require('./redisTimeSeriesClient');
const Toggler = require('./toggler');
const { objectsKeysSnakeToCamel } = require('./utils');

class FlagManager {
  constructor({
    natsStream = 'flags_ruleset',
    natsServer,
    sdkKey = '',
    appId,
    userContext = '',
    redisHost,
    redisPort,
  }) {
    this.natsClient = new NatsClient({
      stream: natsStream,
      server: natsServer,
      subject: appId,
      callback: this._setFlags.bind(this),
      sdkKey,
    });
    const redisAddress = `${redisHost}:${redisPort}`;
    this._redisTSClient = new RedisTimeSeriesClient(redisAddress);

    this._flags = [];
    this._userContext = userContext;
  }

  async initializeFlags() {
    await this.natsClient.initializeFlags();
    await this._redisTSClient.init();
  }

  _setFlags(flags) {
    this._flags = objectsKeysSnakeToCamel(flags);
  }

  getFlags() {
    return this._flags;
  }

  setUserContext(newUserContext) {
    this._userContext = newUserContext;
  }

  getUserContext() {
    return this._userContext;
  }

  async disconnect() {
    await this.natsClient.disconnect();
    await this._redisTSClient.disconnect();
  }

  newToggler(config) {
    const newToggle = new Toggler({
      ...config,
      getFlags: this.getFlags.bind(this),
      userContext: this._userContext,
      emitRedisSignal: this._redisTSClient.emitSignal(),
    });

    return newToggle;
  }
}

module.exports = FlagManager;
