const {
  connect,
  consumerOpts,
  createInbox,
  JSONCodec,
  StringCodec,
} = require('nats');

const RedisTimeSeries = require('redistimeseries-js');
const { DuplicatePolicy, Aggregation } = RedisTimeSeries;

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
    await this.redisTSClient.quit();
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

class RedisTimeSeriesClient {
  constructor(redisAddress) {
    this.redisAddress = { url: redisAddress } || {
      url: 'http://localhost:6379',
    };
    this.redisClient = null;
  }

  async init() {
    this.redisClient = new RedisTimeSeries(this.redisAddress);
    await this.redisClient.connect();
  }

  emitSignal(...args) {
    // binding function that maintains the RedisClient Context whenever we invoke emitRedisSignal
    return this.emitRedisSignal.bind(this, ...args);
  }

  async emitRedisSignal(flagId, status) {
    await this.redisClient
      .add(`${flagId}:${status}`, Date.now(), 1)
      .onDuplicate(DuplicatePolicy.SUM)
      .labels({ type: status, flagId: flagId })
      .send();
  }

  async readRedisSignal(flagId, status) {
    const now = Date.now();
    const query = await this.redisClient
      .range(`${flagId}:${status}`, now - 10000, now)
      .aggregation(Aggregation.SUM, 10000)
      .send();
    return query;
  }
}

// Manager stores the newest flags
// NatsClient gets newest flags -> update Manager

// Toggler can access the flags in the Manager with 'getFlags'
// whenever code activates Toggler action, Toggler will check the newest flags in Manager

class Toggler {
  constructor({
    flagName,
    featureCb = () => {},
    defaultCb = () => {},
    errorCondition = '',
    getFlags,
    emitRedisSignal,
  }) {
    this.flagName = flagName;
    this.featureCb = featureCb;
    this.defaultCb = defaultCb;
    this.errorCondition = errorCondition;
    this.getFlags = getFlags;
    this.flagId = this._getFlagId(flagName);
    this.emitRedisSignal = emitRedisSignal;
  }

  _getFlagId(flagName) {
    const flags = this.getFlags();
    const matchingFlag = flags.find((flag) => {
      return flag.title === flagName;
    });
    console.log(matchingFlag);
    return matchingFlag.id;
  }

  // isFlagActive - display regular T/F for if/else functionality
  isFlagActive() {
    const flags = this.getFlags();
    const matchingFlag = flags.filter((flag) => {
      return flag.title === this.flagName && flag.is_active;
    }); // return [ {flag} ] if true; otherwise [ ]
    return matchingFlag.length === 1;
  }

  async emitSuccess() {
    this.emitRedisSignal(this.flagId, 'success');
  }

  async emitFailure() {
    this.emitRedisSignal(this.flagId, 'failure');
  }
}

class NatsClient {
  constructor({ server, appId, callback, sdkKey }) {
    // config provided when a new NatsClient is instantiated
    this.natsConnection = null; // Create Nats Connection
    this.jetStreamManager = null;
    this.jetStream = null;
    this.subscribedStream = null;
    this.natsConfig = { servers: server, token: sdkKey };
    this.appId = String(appId);
    this.callback = callback;
    this.jsonCoder = JSONCodec();
    this.stringCoder = StringCodec();
  }

  async init() {
    await this.connect();
    await this.subscribe();
  }

  async connect() {
    this.natsConnection = await connect(this.natsConfig);
    this.jetStreamManager = await this.natsConnection.jetstreamManager();
    this.jetStream = await this.natsConnection.jetstream(); // Creating JetStream Connections (publish to subjects on stream, subscribe to subjects on stream)
  }

  async disconnect() {
    await this.subscribedStream.unsubscribe(); //Unsubscribe will typically terminate regardless of whether there are messages in flight for the client
    await this.natsConnection.close();
    // const err = await this.done;
    // if (err) {
    //   console.log(`error closing:`, err);
    // }
  }

  async subscribe() {
    // Creating a Consumer with Configurations
    const options = consumerOpts(); // creates a Consumer Options Object
    options.deliverNew(); // ensures that the newest message on the stream is delivered to the consumer when it comes online
    options.ackAll(); // acknowledges all previous messages
    options.deliverTo(createInbox()); // ensures that the Consumer listens to a specific Subject
    this.subscribedStream = await this.jetStream.subscribe(this.appId, options); // creates a Consumer that is subscribed to 'teststream' with the set Consumer Options

    await this.fetchLatestMessage();

    (async () => {
      console.log('fetching newest messages');
      this.fetchOngoingEventMessages();
    })();
  }

  async fetchLatestMessage() {
    try {
      const lastMessage = await this.jetStreamManager.streams.getMessage(
        'flags',
        { last_by_subj: this.appId }
      );
      await this.decodeReceivedMessages([lastMessage]);
    } catch (error) {
      console.error(error);
    }
  }

  async fetchOngoingEventMessages() {
    this.decodeReceivedMessages(this.subscribedStream);
  }

  async decodeReceivedMessages(messages) {
    for await (const message of messages) {
      console.log('within decodeReceivedMessages');
      let decodedData;
      try {
        decodedData = this.jsonCoder.decode(message.data);
      } catch (e) {
        decodedData = this.stringCoder.decode(message.data);
      }
      console.log('got decodedData from fetchStreamMessage', decodedData);
      this.callback(decodedData);
    }
  }
}

module.exports = {
  FlagManager,
  NatsClient,
};
