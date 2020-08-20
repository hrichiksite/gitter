'use strict';

var _ = require('lodash');
var util = require('util');
var BaseRetentionAnalyser = require('./base-cohort-analyser');
var persistence = require('gitter-web-persistence');

var webClientPromise = persistence.OAuthClient.findOne({ name: 'Gitter OSX', tag: 'mac' })
  .exec()
  .then(function(oauthClient) {
    if (!oauthClient) throw new Error('Unable to load internal client id.');
    oauthClient = oauthClient.toJSON();
    oauthClient.id = oauthClient._id && oauthClient._id.toString();

    return oauthClient;
  });

function MacDesktopAnalyser() {
  BaseRetentionAnalyser.apply(this, arguments);
}
util.inherits(MacDesktopAnalyser, BaseRetentionAnalyser);

MacDesktopAnalyser.prototype.categoriseUsers = function(allCohortUsers, callback) {
  var userIds = _(allCohortUsers)
    .values()
    .flatten()
    .value();

  return webClientPromise
    .then(function(client) {
      return persistence.OAuthAccessToken.find(
        { clientId: client.id, userId: { $in: userIds } },
        { _id: 0, userId: 1 }
      ).exec();
    })
    .then(function(results) {
      var usersWithMacLogin = _(results)
        .transform(function(result, token) {
          result[token.userId] = 1;
        }, {})
        .value();
      return _(userIds)
        .transform(function(result, userId) {
          result[userId] = usersWithMacLogin[userId] == 1 ? 'MacDesktop' : 'NoMacDesktop';
        }, {})
        .value();
    })
    .nodeify(callback);
};

module.exports = MacDesktopAnalyser;
