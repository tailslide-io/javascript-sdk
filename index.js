const { FlagManager } = require('./lib/flagManager');

const config = {
  server: 'nats://127.0.0.1:4222',
  appId: 9,
};

(async () => {
  const manager = new FlagManager(config);
  await manager.init();

  const cleanup = async () => {
    await manager.disconnect();
    console.log('closing nats');
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();
