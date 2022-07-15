class Toggler {
  constructor({
    flagName,
    featureCb = () => {},
    defaultCb = () => {},
    errorCondition = '',
    getFlags,
    emitRedisSignal,
  }) {
    this.flagName = flagName;
    this.featureCb = featureCb;
    this.defaultCb = defaultCb;
    this.errorCondition = errorCondition;
    this.getFlags = getFlags;
    this.flagId = this._getFlagId(flagName);
    this.emitRedisSignal = emitRedisSignal;
  }

  _getFlagId(flagName) {
    const flags = this.getFlags();
    const matchingFlag = flags.find((flag) => {
      return flag.title === flagName;
    });
    console.log(matchingFlag);
    return matchingFlag.id;
  }

  // isFlagActive - display regular T/F for if/else functionality
  isFlagActive() {
    const flags = this.getFlags();
    const matchingFlag = flags.filter((flag) => {
      return flag.title === this.flagName && flag.is_active;
    }); // return [ {flag} ] if true; otherwise [ ]
    return matchingFlag.length === 1;
  }

  async emitSuccess() {
    this.emitRedisSignal(this.flagId, 'success');
  }

  async emitFailure() {
    this.emitRedisSignal(this.flagId, 'failure');
  }
}

module.exports = Toggler;
