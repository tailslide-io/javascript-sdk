const objectKeysSnakeToCamel = (obj) => {
  return Object.entries(obj).reduce((formattedObj, [key, value]) => {
    const camelKey = key.replace(/([-_][a-z])/gi, ($1) => {
      return $1.toUpperCase().replace('-', '').replace('_', '');
    });
    formattedObj[camelKey] = value;
    return formattedObj;
  }, {});
};
const objectsKeysSnakeToCamel = (objs) => {
  return objs.map(objectKeysSnakeToCamel);
};

module.exports = { objectsKeysSnakeToCamel, objectKeysSnakeToCamel };
