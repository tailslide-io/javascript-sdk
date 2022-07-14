const { NatsClient } = require('./lib/flagManager');

const config = {
  natsConfig: {
    servers: 'nats://127.0.0.1:4222',
  },
  appId: 9,
};

(async () => {
  const client = new NatsClient(config);
  await client.connect();
  await client.subscribe();
})();

/*

[20] Subject: 9 Received: 2022-07-14T14:50:00-04:00

[{"id":15,"app_id":9,"title":"Flag in app 9 number 1","description":"","is_active":false,"rollout":"0","white_listed_users":"","error_threshold":"0.0","created_at":"2022-07-14T18:40:23.836Z","updated_at":"2022-07-14T18:50:00.543Z"}]

nats stream add ORDERS --subjects "ORDERS.*" --ack --max-msgs=-1 --max-bytes=-1 --max-age=1y --storage file --retention limits --max-msg-size=-1 --discard=old


nats pub foo --count=1000 --sleep 1s "publication #{{Count}} @ {{TimeStamp}}"

*/
