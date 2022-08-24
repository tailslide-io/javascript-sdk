const FlagManager = require('../lib/flagManager');
const Toggler = require('../lib/toggler');

const exampleConfigObj = {
  server: 'nats://127.0.0.1:4222',
  appId: 1,
  userContext: 'fbe6133c-f751-46f4-b275-4e8c3aa22e24',
  sdkKey: 'myToken',
  redisHost: 'localhost://127.0.0.1',
  redisPort: '6379'
};

beforeAll(() => {
  instanceOfManager = new FlagManager(exampleConfigObj);
  jest.spyOn(Toggler.prototype, '_getMatchingFlag').mockImplementation(() => { 
    return { "id": 1, "appId": 1, "isActive": true, "rolloutPercentage": 100, "whiteListedUsers": "", "circuitRecoveryPercentage": 100 }
  });
  instanceOfToggler = instanceOfManager.newToggler({ flagName: "first flag"});
});

describe('Toggler is instantiated upon calling via instance of FlagManager', () => {
  test('Name passed into method is used', () => {
    expect(instanceOfToggler.flagName).toBe("first flag");
  })

  test('userContext is set upon instantiation', () => {
    expect(instanceOfToggler.userContext).toBe('fbe6133c-f751-46f4-b275-4e8c3aa22e24');
  })

  test('flagId is set upon instantiation', () => {
    expect(instanceOfToggler.flagId).toBe("1");
  })

  test('appId is set upon instantiation', () => {
    expect(instanceOfToggler.appId).toBe("1");
  })
});

describe('check that isFlagActive works', () => {
  test('flag evaluates to true when it is active and the rollout percentage is 100', () => {
    expect(instanceOfToggler.isFlagActive()).toBe(true);
  })

  test('flag evaluates to true when it is active and the user is whitelisted', () => {
    let spy = jest.spyOn(instanceOfToggler, '_getMatchingFlag').mockImplementation(() => { 
      return { "id": 1, "appId": 1, "isActive": true, "rolloutPercentage": 0, "whiteListedUsers": 'fbe6133c-f751-46f4-b275-4e8c3aa22e24' }
    });
    expect(instanceOfToggler.isFlagActive()).toBe(true);
  })

  test('flag evaluates to true when it is active and the hashed userContext is greater than the rollout percentage', () => {
    let spy = jest.spyOn(instanceOfToggler, '_getMatchingFlag').mockImplementation(() => { 
      return { "id": 1, "appId": 1, "isActive": true, "rolloutPercentage": 70, "whiteListedUsers": 'fbe6133c-f751-46f4-b275-4e8c3aa22e24', "circuitRecoveryPercentage": 100 }
    });
    let spy2 = jest.spyOn(instanceOfToggler, '_hashUserContext').mockImplementation(() => { 
      return 100;
    });
    expect(instanceOfToggler.isFlagActive()).toBe(true);
  })

  test('flag evaluates to false when it is active and the hashed userContext is greater than the rollout percentage', () => {
    let spy = jest.spyOn(instanceOfToggler, '_getMatchingFlag').mockImplementation(() => { 
      return { "id": 1, "appId": 1, "isActive": true, "rolloutPercentage": 70, "whiteListedUsers": "", "circuitRecoveryPercentage": 100 }
    });
    let spy2 = jest.spyOn(instanceOfToggler, '_hashUserContext').mockImplementation(() => { 
      return 100;
    });
    expect(instanceOfToggler.isFlagActive()).toBe(false);
  })

  test('flag evaluates to false when it is not active', () => {
    let spy = jest.spyOn(instanceOfToggler, '_getMatchingFlag').mockImplementation(() => { 
      return { "id": 1, "appId": 1, "isActive": false, "rolloutPercentage": 70, "whiteListedUsers": "", "circuitRecoveryPercentage": 100 }
    });
    expect(instanceOfToggler.isFlagActive()).toBe(false);
  })

  test('flag evaluates to false when it is not active even if the user is whitelisted', () => {
    let spy = jest.spyOn(instanceOfToggler, '_getMatchingFlag').mockImplementation(() => { 
      return { "id": 1, "appId": 1, "isActive": false, "rolloutPercentage": 70, "whiteListedUsers": 'fbe6133c-f751-46f4-b275-4e8c3aa22e24', "circuitRecoveryPercentage": 100 }
    });
    expect(instanceOfToggler.isFlagActive()).toBe(false);
  })
})

afterAll(() => {
  jest.restoreAllMocks();
});
