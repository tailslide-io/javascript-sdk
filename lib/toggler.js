const crypto = require('crypto');

class Toggler {
  constructor({ flagName, getFlags, emitRedisSignal, userContext }) {
    this.flagName = flagName;
    this.getFlags = getFlags;
    this.flagId = null;
    this.appId = null;
    this._setFlagIdAndAppId();
    this.emitRedisSignal = emitRedisSignal;
    this.userContext = userContext;
  }

  isFlagActive() {
    const flag = this._getMatchingFlag();
    return (
      flag.isActive &&
      (this._isUserWhiteListed(flag) || this._validateUserRollout(flag))
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

  _setFlagIdAndAppId() {
    const matchingFlag = this._getMatchingFlag();
    this.flagId = String(matchingFlag.id);
    this.appId = String(matchingFlag.appId);
  }

  _getMatchingFlag() {
    const flags = this.getFlags(); 
    const matchingFlag = flags.find((flag) => flag.title === this.flagName);

    if (!matchingFlag) {
      throw new Error(`Cannot find flag with flag name of: ${this.flagName}`);
    }
    return matchingFlag;
  }

  _isUserWhiteListed(flag) {
    return flag.whiteListedUsers.split(',').includes(this.userContext);
  }

  _validateUserRollout(flag) {
    let rollout = flag.rolloutPercentage / 100;
    if (this._circuitInRecovery(flag)) {
      rollout = rollout * (flag.circuitRecoveryPercentage / 100);
    }

    return this._isUserInRollout(rollout);
  }

  _circuitInRecovery(flag) {
    return flag.isRecoverable && flag.circuitStatus === 'recovery';
  }

  _isUserInRollout(rollout) {
    return this._hashUserContext() <= rollout;
  }

  _hashUserContext() {
    const hash = crypto
      .createHash('md5')
      .update(this.userContext)
      .digest('hex');
    const value = (parseInt(hash, 16) % 100) / 100;
    return value;
  }
}

module.exports = Toggler;
