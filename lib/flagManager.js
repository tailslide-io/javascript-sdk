const {
  connect,
  consumerOpts,
  createInbox,
  JSONCodec,
  StringCodec,
} = require('nats');

// this.flags
// this when called by FlagManager refers to an instance of FlagManager
// this when called either NatsClient or Toggler, this refers to NatsClient or Toggler, which they don't have "flags" property (undefined)

class FlagManager {
  constructor({ server, appId, sdkKey = '', userContext = '' }) {
    this.natsClient = new NatsClient({
      server,
      appId,
      callback: this._setFlags.bind(this),
      sdkKey,
    });
    this.flags = [];
    this.userContext = userContext;
  }

  async init() {
    await this.natsClient.init();
  }

  _setFlags(flags) {
    this.flags = flags;
  }

  getFlags() {
    return this.flags;
  }

  async disconnect() {
    await this.natsClient.disconnect();
  }

  newToggler(config) {
    const newToggle = new Toggler({
      ...config,
      getFlags: this.getFlags.bind(this),
      userContext: this.userContext,
    });

    return newToggle;
  }
}

// Manager stores the newest flags
// NatsClient gets newest flags -> update Manager

// Toggler can access the flags in the Manager with 'getFlags'
// whenever activates Toggler action, Toggler will check the newest flags in Manager

class Toggler {
  constructor({
    flagName,
    featureCb = () => {},
    defaultCb = () => {},
    errorCondition = '',
    getFlags,
  }) {
    this.flagName = flagName;
    this.featureCb = featureCb;
    this.defaultCb = defaultCb;
    this.errorCondition = errorCondition;
    this.getFlags = getFlags;
  }

  // isFlagActive - display regular T/F for if/else functionality
  isFlagActive() {
    const flags = this.getFlags();
    const matchingFlag = flags.filter((flag) => {
      return flag.title === this.flagName && flag.is_active;
    }); // return [ {flag} ] if true; otherwise [ ]
    return matchingFlag.length === 1;
  }
}

class NatsClient {
  constructor({ server, appId, callback, sdkKey }) {
    // config provided when a new NatsClient is instantiated
    this.natsConnection = null; // Create Nats Connection
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

  /* TBD with Team
  // MsgRequest - Interface
  export type MsgRequest = SeqMsgRequest | LastForMsgRequest | number;

  export interface LastForMsgRequest {
    "last_by_subj": string;
  }

  export interface SeqMsgRequest {
    seq: number;
  }

  // NATS Example
  const sm = await jsm.streams.getMessage(stream, { seq: 1 }); // Usage from NATS - export a particular sequence from a Stream

  // Proposed
  const streamName = 'flags'
  const subject = 9 // this is the AppId

  const lastMessage = await jetStreamManager.streams.getMessage(
    streamName, 
    { LastForMsgRequest: subject }
  )


  */

  async subscribe() {
    // Creating a Consumer with Configurations
    const options = consumerOpts(); // creates a Consumer Options Object
    options.deliverLast(); // ensures that the last message on the stream is delivered to the consumer when it comes online
    options.ackAll(); // acknowledges all previous messages
    options.deliverTo(createInbox()); // ensures that the Consumer listens to a specific Subject
    this.subscribedStream = await this.jetStream.subscribe(this.appId, options); // creates a Consumer that is subscribed to 'teststream' with the set Consumer Options

    (async () => {
      console.log('fetching newest messages');
      this.fetchStreamMessages();
    })();
    // this.fetchStreamMessages();
  }

  async fetchOneMessage() {
    let messages = await this.jetStream.fetch('flags', 'me', {
      batch: 1,
      expires: 100,
    });
    this.decodeReceivedMessages(messages);
    // for await (const message of messages) {
    //   let decodedData;
    //   try {
    //     decodedData = this.jsonCoder.decode(message.data);
    //   } catch (e) {
    //     decodedData = this.stringCoder.decode(message.data);
    //   }
    //   console.log(decodedData);
    //   this.callback();
    // }
  }

  async fetchStreamMessages(once = false) {
    this.decodeReceivedMessages(this.subscribedStream);
    // for await (const message of this.subscribedStream) {
    //   let decodedData;
    //   try {
    //     decodedData = this.jsonCoder.decode(message.data);
    //   } catch (e) {
    //     decodedData = this.stringCoder.decode(message.data);
    //   }
    //   console.log('got decodedData from fetchStreamMessage', decodedData);
    //   this.callback(decodedData);
    //   if (once) {
    //     console.log('break from loop');
    //     break;
    //   }
    // }
  }

  async decodeReceivedMessages(messages) {
    for await (const message of messages) {
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
