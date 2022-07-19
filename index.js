const FlagManager = require('./lib/flagManager');

const config = {
  server: 'nats://127.0.0.1:4222',
  appId: 1,
  userContext: 'dfcc8acc-8b99-42f7-b63d-b7c51268f2c4',
};

// 375d39e6-9c3f-4f58-80bd-e5960b710295 -> 120
// dfcc8acc-8b99-42f7-b63d-b7c51268f2c4 -> 544

(async () => {
  const manager = new FlagManager(config);
  // await manager.init();
  await manager.initializeFlags();

  const flagConfig = {
    flagName: 'Flag in app 1 number 1',
  };

  const FlagToggler = manager.newToggler(flagConfig);
  let counts = 0;

  if (FlagToggler.isFlagActive()) {
    console.log('Flag in App9 number 2 is active!');
    await FlagToggler.emitSuccess();
  } else {
    console.log('Flag in App9 number 2 is not active!');
    await FlagToggler.emitFailure();
  }

  // const response = await manager.redisTSClient.readRedisSignal(
  //   FlagToggler.flagId,
  //   'failure'
  // );
  // console.log(response);

  let count = 0;
  const interval = setInterval(async () => {
    let randomInt = Math.random();

    if (randomInt < 0.5) {
      console.log('emtting success');
      await FlagToggler.emitSuccess();
    } else {
      console.log('emitting failure');
      await FlagToggler.emitFailure();
    }
    count++;
    if (count > 20) {
      clearInterval(interval);
    }
  }, 100);

  const cleanup = async () => {
    await manager.disconnect();
    console.log('closing nats');
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();
