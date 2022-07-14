const {
  connect,
  consumerOpts,
  createInbox,
  JSONCodec,
  StringCodec,
} = require('nats');

class FlagManager {
  constructor() {}

  // async init() {
  //   await this.natsClient.connect(config);
  // }
}

class NatsClient {
  constructor(config) {
    // config provided when a new NatsClient is instantiated
    this.natsConnection = null; // Create Nats Connection
    this.jetStream = null;
    this.subscribedStream = null;
    this.natsConfig = config.natsConfig;
    this.appId = String(config.appId);
    this.callback = config.callback;
    this.jsonCoder = JSONCodec();
    this.stringCoder = StringCodec();
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
        const decodedData = this.stringCoder.decode(message.data);
        console.log(decodedData);
        // TODO: use json decoder
      }
    })();
  }
}

module.exports = {
  FlagManager,
  NatsClient,
};
