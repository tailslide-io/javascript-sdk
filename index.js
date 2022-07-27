const SimpleNoise = require('yy-noise');
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

  const flagToggler = manager.newToggler(flagConfig);

  if (flagToggler.isFlagActive()) {
    console.log(`Flag in ${appId} with name "${flagName}" is active!`);
    await flagToggler.emitSuccess();
  } else {
    console.log(`Flag in ${appId} with name "${flagName}" is not active!`);
    await flagToggler.emitFailure();
  }
  const successRates = [0.2, 0.8, 0.2, 0.8, 0.2];
  let count = 0;
  const noise = new SimpleNoise({ amplitude: 1, scale: 0.25 });

  const interval = setInterval(async () => {
    // let randomInt = Math.random();

    const noiseValue = noise.get(count);
    console.log(
      '🚀 ~ file: index.js ~ line 44 ~ interval ~ noiseValue',
      noiseValue
    );
    if (flagToggler.isFlagActive()) {
      if (noiseValue < 0.5) {
        console.log('emitting success');
        await flagToggler.emitSuccess();
      } else {
        console.log('emitting failure');
        await flagToggler.emitFailure();
      }
      count++;
      if (count > 1000) {
        clearInterval(interval);
      }
    }
  }, 1000);

  const cleanup = async () => {
    await manager.disconnect();
    console.log('closing nats');
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();
