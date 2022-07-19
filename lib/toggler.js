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
    return (
      flag.is_active &&
      (this.isUserWhiteListed(flag) || this.isUserInRollout(flag))
    );
  }

  getMatchingFlag() {
    const flags = this.getFlags();
    const matchingFlag = flags.find((flag) => {
      return flag.title === this.flagName && flag.is_active;
    });

    if (!matchingFlag) {
      throw new Error(`Cannot find flag with flag name of: ${this.flagName}`);
    }
    return matchingFlag;
  }

  isUserWhiteListed(flag) {
    return flag.white_listed_users.split(',').includes(this.userContext);
  }

  isUserInRollout(flag) {
    const { rolloutPercentage } = flag;
    const hash = crypto
      .createHash('md5')
      .update(this.userContext)
      .digest('hex');
    const value = parseInt(hash, 16) % 1000;
    return value < rolloutPercentage;
  }

  async emitSuccess() {
    if (!this.flagId) return;
    this.emitRedisSignal(this.flagId, 'success');
  }

  async emitFailure() {
    if (!this.flagId) return;
    this.emitRedisSignal(this.flagId, 'failure');
  }
}

module.exports = Toggler;
