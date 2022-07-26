const FlagManager = require('./lib/flagManager');

const appId = 1;
const flagName = 'App 1 Flag 1';

const config = {
  server: 'nats://127.0.0.1:4222',
  appId: 1,
  userContext: '375d39e6-9c3f-4f58-80bd-e5960b710295',
  sdkKey: 'myToken',
};

// fbe6133c-f751-46f4-b275-4e8c3aa22e24 -> 84
// 375d39e6-9c3f-4f58-80bd-e5960b710295 -> 20
// dfcc8acc-8b99-42f7-b63d-b7c51268f2c4 -> 44

(async () => {
  const manager = new FlagManager(config);
  // await manager.init();
  await manager.initializeFlags();

  const flagConfig = {
    flagName,
  };

  const FlagToggler = manager.newToggler(flagConfig);

  if (FlagToggler.isFlagActive()) {
    console.log(`Flag in ${appId} with name "${flagName}" is active!`);
    await FlagToggler.emitSuccess();
  } else {
    console.log(`Flag in ${appId} with name "${flagName}" is not active!`);
    await FlagToggler.emitFailure();
  }
  const successRates = [0.2, 0.8, 0.2, 0.8, 0.2];
  let count = 0;
  const interval = setInterval(async () => {
    let randomInt = Math.random();

    if (randomInt < 0.01) {
      console.log('emitting success');
      await FlagToggler.emitSuccess();
    } else {
      console.log('emitting failure');
      await FlagToggler.emitFailure();
    }
    count++;
    if (count > 100) {
      clearInterval(interval);
    }
  }, 1000);

  const cleanup = async () => {
    await manager.disconnect();
    console.log('closing nats');
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();
