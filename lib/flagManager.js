const {
  connect,
  consumerOpts,
  createInbox,
  JSONCodec,
  StringCodec,
} = require('nats');
const NatsClient = require('./natsClient');
const RedisTimeSeriesClient = require('./redisTimeSeriesClient');
const Toggler = require('./toggler');

// this.flags
// this when called by FlagManager refers to an instance of FlagManager
// this when called either NatsClient or Toggler, this refers to NatsClient or Toggler, which they don't have "flags" property (undefined)

class FlagManager {
  constructor({ server, appId, sdkKey = '', userContext = '', redisAddress }) {
    this.natsClient = new NatsClient({
      server,
      appId,
      callback: this._setFlags.bind(this),
      sdkKey,
    });
    this.redisTSClient = new RedisTimeSeriesClient(redisAddress);

    this.flags = [];
    this.userContext = userContext;
  }

  async init() {
    await this.natsClient.init();
    await this.redisTSClient.init();
  }

  _setFlags(flags) {
    this.flags = flags;
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

// Manager stores the newest flags
// NatsClient gets newest flags -> update Manager

// Toggler can access the flags in the Manager with 'getFlags'
// whenever code activates Toggler action, Toggler will check the newest flags in Manager

module.exports = FlagManager;
