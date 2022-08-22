const NatsClient = require('./natsClient');
const RedisTimeSeriesClient = require('./redisTimeSeriesClient');
const Toggler = require('./toggler');
const { objectsKeysSnakeToCamel } = require('./utils');
import Cookies from 'js-cookie';

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
    this._userContext = userContext;
    this._togglersInApp = []; //to keep track of each developer-created toggler so we can update all when a UUID is updated
  }

  async initializeFlags() {
    await this.natsClient.initializeFlags();
    await this.redisTSClient.init();
  }

  _setFlags(flags) {
    this.flags = objectsKeysSnakeToCamel(flags);
  }

  /*
  uses js-cookie API -> https://github.com/js-cookie/js-cookie/tree/latest#readme
  checks cookies for one named "TailslideUserContext" - will require developer to provide userContext to each user via Cookies.set('TailslideUserContext', 'fbe6133c-f751-46f4-b275-4e8c3aa22e24')
  returns a string value representing the UUID
  we could also instruct the developer to alter this method to fit their needs...
  */
  _getUserContext() { 
    return Cookies.get('TailslideUserContext');
  }

  getFlags() {
    return this.flags;
  }

  async disconnect() {
    await this.natsClient.disconnect();
    await this.redisTSClient.disconnect();
  }

  setUserContext() { //this updates the userContext on the FlagManager and every existing Toggler Instantiation
    let newUserContext = _getUserContext();
    this._userContext = newUserContext;
    this._togglersInApp.map(toggler => {
      toggler.userContext = newUserContext;
    });
  }

  newToggler(config) {
    const newToggle = new Toggler({
      ...config,
      getFlags: this.getFlags.bind(this),
      userContext: this._userContext,
      emitRedisSignal: this.redisTSClient.emitSignal(),
    });
    this._togglersInApp.push(newToggle);
    return newToggle;
  }
}

const options = {
  url: 'fulladdress',
};

module.exports = FlagManager;
