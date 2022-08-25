const FlagManager = require('../lib/flagManager');

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
});

describe('FlagManager is instantiated upon calling', () => {
  test('userContext is properly passed in', () => {
    expect(instanceOfManager._userContext).toBe('fbe6133c-f751-46f4-b275-4e8c3aa22e24');
  });

  test('there are no flags upon instantiation', () => {
    expect(instanceOfManager._flags.length).toBe(0);
  });
});

describe('getUserContext and setUserContext work as intended', () => {
  test('getUserContext returns user context', () => {
    expect(instanceOfManager.getUserContext()).toBe('fbe6133c-f751-46f4-b275-4e8c3aa22e24');
  });

  test('setUserContext updates user context', () => {
    instanceOfManager.setUserContext('hbe6133e-f751-46f4-f275-4e8c3aa22e27');
    expect(instanceOfManager.getUserContext()).toBe('hbe6133e-f751-46f4-f275-4e8c3aa22e27');
  })
})

describe('getFlags', () => {
  test('getFlags returns what is in the _flags property', () => {
    expect(instanceOfManager.getFlags()).toBe(instanceOfManager._flags);
  });
})
