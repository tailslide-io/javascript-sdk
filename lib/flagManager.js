const NatsClient = require('./natsClient');
const RedisTimeSeriesClient = require('./redisTimeSeriesClient');
const Toggler = require('./toggler');
const { objectsKeysSnakeToCamel } = require('./utils');

/*
  if flag is active:
    check if exists in whitelistedUsers - regex (no dependency on rollout, if flag is active then display to WLUser)
    check if rollout_percentage set - hasing approach (if less than rollout %, return true)

  userContext:  uuid of 12 or so alphanumeric string

  hash the userContext into number between 1 and 1000
  compare the hashed number with flag's rollout number
    if less than rollout number, return true
      else return false
*/

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
