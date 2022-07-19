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
    this.featureCb = featureCb; // feature TBD
    this.defaultCb = defaultCb; // feature TBD
    this.errorCondition = errorCondition;
    this.getFlags = getFlags;
    this.flagId = null;
    this.appId = null;
    this._setFlagIdAndAppId(flagName)
    this.emitRedisSignal = emitRedisSignal;
    this.userContext = userContext;
  }


  // isFlagActive - display regular T/F for if/else functionality
  isFlagActive() {
    const flag = this._getMatchingFlag();
    return (
      flag.is_active &&
      (this._isUserWhiteListed(flag) || this._isUserInRollout(flag))
    );
  }
  async emitSuccess() {
    if (!this.flagId) return;
    this.emitRedisSignal(this.flagId, this.appId, 'success');
  }

  async emitFailure() {
    if (!this.flagId) return;
    this.emitRedisSignal(this.flagId, this.appId, 'failure');
  }

  // sets flagId and appId on Toggler initialization
  _setFlagIdAndAppId(flagName) { 
    const matchingFlag = this._getMatchingFlag()
    this.flagId = String(matchingFlag.id);
    this.appId = String(matchingFlag.app_id);
  }

  _getMatchingFlag() {
    const flags = this.getFlags(); // need to get the active flags if ruleset changes
    const matchingFlag = flags.find((flag) => {
      return flag.title === this.flagName && flag.is_active;
    });

    if (!matchingFlag) {
      throw new Error(`Cannot find flag with flag name of: ${this.flagName}`);
    }
    return matchingFlag;
  }

  _isUserWhiteListed(flag) {
    return flag.white_listed_users.split(',').includes(this.userContext);
  }

  _isUserInRollout(flag) {
    const { rolloutPercentage } = flag;
    const hash = crypto
      .createHash('md5')
      .update(this.userContext)
      .digest('hex');
    const value = parseInt(hash, 16) % 1000;
    return value < rolloutPercentage;
  }

}

module.exports = Toggler;
