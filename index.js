const { FlagManager } = require('./lib/flagManager');

const config = {
  server: 'nats://127.0.0.1:4222',
  appId: 9,
};

(async () => {
  const manager = new FlagManager(config);
  await manager.init();

  const flagConfig = {
    flagName: 'Flag in app 9 number 2',
  };

  const FlagToggler = manager.newToggler(flagConfig);
  let counts = 0;
  // let interval = setInterval(() => {
  if (FlagToggler.isFlagActive()) {
    console.log('Flag in App9 number 2 is active!');
    await FlagToggler.emitSuccess();
  } else {
    console.log('Flag in App9 number 2 is not active!');
    await FlagToggler.emitFailure();
  }
  //   counts++;
  //   if (counts > 3) {
  //     clearInterval(interval);
  //   }
  // }, 3000);

  const response = await manager.redisTSClient.readRedisSignal(
    FlagToggler.flagId,
    'failure'
  );
  console.log(response);

  const cleanup = async () => {
    await manager.disconnect();
    console.log('closing nats');
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();
