const {
  connect,
  consumerOpts,
  createInbox,
  JSONCodec,
  StringCodec,
} = require('nats');

/*
  NatsClient config 
  
  config = {
    natsConfig: {
      servers: 'nats://127.0.0.1:4222', [opt]
      token: sdkKey [req]
    },
    appId: 9,
    setFlags: ()=>{}
  };
  
*/

class FlagManager {
  constructor({ server, appId, sdkKey = '' }) {
    this.natsClient = new NatsClient({
      server,
      appId,
      callback: this._setFlags,
      sdkKey,
    });
    this.flags = [];
  }

  async init() {
    await this.natsClient.init();
  }

  _setFlags(flags) {
    this.flags = flags;
    console.log(this.flags);
  }

  async disconnect() {
    await this.natsClient.disconnect();
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

  async subscribe() {
    // Creating a Consumer with Configurations
    const options = consumerOpts(); // creates a Consumer Options Object
    options.deliverLast(); // ensures that the last message on the stream is delivered to the consumer when it comes online
    options.ackAll(); // acknowledges all previous messages
    options.deliverTo(createInbox()); // ensures that the Consumer listens to a specific Subject
    this.subscribedStream = await this.jetStream.subscribe(this.appId, options); // creates a Consumer that is subscribed to 'teststream' with the set Consumer Options

    (async () => {
      for await (const message of this.subscribedStream) {
        let decodedData;
        try {
          decodedData = this.jsonCoder.decode(message.data);
        } catch (e) {
          decodedData = this.stringCoder.decode(message.data);
        }

        this.callback(decodedData);
        console.log(decodedData);
      }
    })();
  }
}

module.exports = {
  FlagManager,
  NatsClient,
};
