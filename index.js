const { FlagManager } = require('./lib/flagManager');

const config = {
  server: 'nats://127.0.0.1:4222',
  appId: 9,
};

(async () => {
  const manager = new FlagManager(config);
  await manager.init();

  // const flagConfig = {
  //   flagName: 'Flag in app 9 number 2',
  // };

  // const FlagToggler = manager.newToggler(flagConfig);
  // let counts = 0;
  // let interval = setInterval(() => {
  //   if (FlagToggler.isFlagActive()) {
  //     console.log('Flag in App9 number 2 is active!');
  //   } else {
  //     console.log('Flag in App9 number 2 is not active!');
  //   }
  //   counts++;
  //   if (counts > 5) {
  //     clearInterval(interval);
  //   }
  // }, 5000);

  const cleanup = async () => {
    await manager.disconnect();
    console.log('closing nats');
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();
