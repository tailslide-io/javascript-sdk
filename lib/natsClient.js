const {
  JSONCodec,
  StringCodec,
  connect,
  consumerOpts,
  createInbox,
} = require('nats');

class NatsClient {
  constructor({ stream, server, subject, callback, sdkKey }) {
    // config provided when a new NatsClient is instantiated
    this.natsConnection = null; // Create Nats Connection
    this.jetStreamManager = null;
    this.jetStream = null;
    this.subscribedStream = null;
    this.natsConfig = { servers: server, token: sdkKey };
    this.subject = this._formatSubject(String(subject));
    this.callback = callback;
    this.jsonCoder = JSONCodec();
    this.stringCoder = StringCodec();
    this.stream = stream;
  }

  async initializeFlags() {
    await this.connect();
    await this.fetchLatestMessage();
    this.fetchOngoingEventMessages();
  }

  async connect() {
    this.natsConnection = await connect(this.natsConfig);
    this.jetStreamManager = await this.natsConnection.jetstreamManager();
    this.jetStream = await this.natsConnection.jetstream(); // Creating JetStream Connections (publish to subjects on stream, subscribe to subjects on stream)
  }

  async disconnect() {
    await this.subscribedStream.unsubscribe(); // Unsubscribe will typically terminate regardless of whether there are messages in flight for the client
    await this.natsConnection.close();
    // const err = await this.done;
    // if (err) {
    //   console.log(`error closing:`, err);
    // }
  }

  async fetchLatestMessage() {
    try {
      const lastMessage = await this.jetStreamManager.streams.getMessage(
        this.stream,
        { last_by_subj: this.subject }
      );
      await this.decodeReceivedMessages([lastMessage]);
    } catch (error) {
      console.error(error);
    }
  }

  async fetchOngoingEventMessages() {
    const options = consumerOpts(); // creates a Consumer Options Object
    options.deliverNew(); // ensures that the newest message on the stream is delivered to the consumer when it comes online
    options.ackAll(); // acknowledges all previous messages
    options.deliverTo(createInbox()); // ensures that the Consumer listens to a specific Subject
    (async () => {
      this.subscribedStream = await this.jetStream.subscribe(
        this.subject,
        options
      );
      this.decodeReceivedMessages(this.subscribedStream);
    })();
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

  _formatSubject(subject) {
    return `apps.${subject}.>`;
  }
}

module.exports = NatsClient;
