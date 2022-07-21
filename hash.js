const crypto = require('crypto');

function isUserInRollout(uuid) {
  const rollout_percentage = 500;
  const hash = crypto.createHash('md5').update(uuid).digest('hex');
  const value = parseInt(hash, 16) % 100;
  console.log(value);
  return value < rollout_percentage;
}

const uuid = crypto.randomUUID();
console.log(uuid);
console.log(isUserInRollout(uuid));
