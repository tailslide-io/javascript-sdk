const crypto = require('crypto');

class Toggler {
  constructor({
    flagName,
    featureCb = () => {},
    defaultCb = () => {},
    errorCondition = '',
    getFlags,
    emitRedisSignal,
    userContext,
  }) {
    this.flagName = flagName;
    this.featureCb = featureCb;
    this.defaultCb = defaultCb;
    this.errorCondition = errorCondition;
    this.getFlags = getFlags;
    this.flagId = this._getFlagId(flagName);
    this.emitRedisSignal = emitRedisSignal;
    this.userContext = userContext;
  }

  _getFlagId(flagName) {
    const flags = this.getFlags();
    const matchingFlag =
      flags.find((flag) => {
        return flag.title === flagName;
      }) || [];
    console.log(matchingFlag);
    return matchingFlag.id;
  }

  // isFlagActive - display regular T/F for if/else functionality
  isFlagActive() {
    const flag = this.getMatchingFlag();
    return flag && (this.isUserWhiteListed(flag) || this.isUserInRollout(flag));
  }

  getMatchingFlag() {
    const flags = this.getFlags();
    const matchingFlag = flags.find((flag) => {
      return flag.title === this.flagName && flag.is_active;
    });

    return matchingFlag;
  }

  isUserWhiteListed(flag) {
    return flag.white_listed_users.split(',').includes(this.userContext);
  }

  isUserInRollout(flag) {
    const { rollout } = flag;
    const hash = crypto
      .createHash('md5')
      .update(this.userContext)
      .digest('hex');
    const value = parseInt(hash, 16) % 1000;
    return value < rollout;
  }

  async emitSuccess() {
    this.emitRedisSignal(this.flagId, 'success');
  }

  async emitFailure() {
    this.emitRedisSignal(this.flagId, 'failure');
  }
}

module.exports = Toggler;
