'use strict';

var persistence = require('gitter-web-persistence');

const userLoader = (userId, user) => async () => {
  if (!userId) return null;
  if (user) return user;
  return persistence.User.findById(userId, null, { lean: true }).exec();
};

module.exports = userLoader;
