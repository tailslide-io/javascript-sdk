const {
  JSONCodec,
  StringCodec,
  connect,
  consumerOpts,
  createInbox,
} = require('nats');

class NatsClient {
  constructor({ stream, server, subject, callback, sdkKey }) {
    this.natsConnection = null;
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
    this.jetStream = await this.natsConnection.jetstream();
  }

  async disconnect() {
    await this.subscribedStream.unsubscribe();
    await this.natsConnection.close();
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
    const options = consumerOpts();
    options.deliverNew();
    options.ackAll();
    options.deliverTo(createInbox());
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
      let decodedData;
      try {
        decodedData = this.jsonCoder.decode(message.data);
      } catch (e) {
        decodedData = this.stringCoder.decode(message.data);
      }
      this.callback(decodedData);
    }
  }

  _formatSubject(subject) {
    return `apps.${subject}.>`;
  }
}

module.exports = NatsClient;
