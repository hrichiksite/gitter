'use strict';

var userService = require('gitter-web-users');
var UserStrategy = require('./user-strategy');

const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');
var idStrategyGenerator = require('gitter-web-serialization/lib/id-strategy-generator');

var UserIdStrategy = idStrategyGenerator('UserIdStrategy', UserStrategy, ids => {
  return userService.findByIds(ids, { read: mongoReadPrefs.secondaryPreferred });
});

UserIdStrategy.slim = function(options) {
  var strategy = UserStrategy.slim(options);
  return UserIdStrategy.withStrategy(strategy);
};

module.exports = UserIdStrategy;
