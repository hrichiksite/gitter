'use strict';

var clientUsageStats = require('../../utils/client-usage-stats');

module.exports = function(req, res, next) {
  var user = req.user;
  var client = req.authInfo && req.authInfo.client;

  if (user && client) {
    clientUsageStats.record(user, client, req);
  }

  next();
};
