'use strict';

var fflip = require('fflip');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var persistence = require('gitter-web-persistence');

/**
 * List of criteria functions to be used by feature toggles
 */
var Criteria = {
  /* Allow a certain percentage of users */
  percentageOfUsers: function(userDetails, percent) {
    var user = userDetails.user;
    if (!user) return false;
    var timestamp = Math.round(mongoUtils.getTimestampFromObjectId(user._id) / 1000) || 0;
    return timestamp % 100 < percent || undefined;
  },

  /* Allow a hash of usernames */
  allowUsernames: function(userDetails, usernameHash) {
    var user = userDetails.user;
    if (!user) return false;
    if (!usernameHash) return undefined;
    return !!usernameHash[user.username] || undefined;
  },

  disableBrowser: function(userDetails, browsers) {
    if (!browsers) return undefined;

    var agent = userDetails.req.getParsedUserAgent();

    var disabledVersion = browsers[agent.family];
    if (!disabledVersion) return undefined;

    if (disabledVersion === 'all') return false;
    if (agent.major <= disabledVersion) return false;
    return undefined;
  },

  bucket: function(userDetails, bucket) {
    var user = userDetails.user;
    if (!user) return false;
    var userId = user._id;

    // This is copied from gitter-env.
    var lastChar = userId.toString().slice(-1);
    var userBucket = parseInt(lastChar + '', 16) % 2 ? 'A' : 'B';

    return userBucket === bucket || undefined;
  },

  createdAfter: function(userDetails, timestamp) {
    var user = userDetails.user;
    if (!user) return false;
    var userTimestamp = mongoUtils.getTimestampFromObjectId(user._id);
    return userTimestamp > timestamp || undefined;
  },

  bucketCreatedAfter: function(userDetails, opts) {
    return (
      (Criteria.bucket(userDetails, opts.bucket) &&
        Criteria.createdAfter(userDetails, opts.createdAfter)) ||
      undefined
    );
  },

  /* Enabled criteria */
  enabled: function(/*user*/) {
    return true;
  }
};

function getFeatures(callback) {
  persistence.FeatureToggle.find({})
    .lean()
    .exec()
    .then(function(togglesList) {
      if (!togglesList || togglesList.length === 0) {
        return callback({});
      }

      var featureToggles = togglesList.reduce(function(memo, toggle) {
        memo[toggle.name] = { criteria: toggle.criteria };
        return memo;
      }, {});

      // NOTE: this callback doesn't have an err.
      callback(featureToggles);
    });
}

fflip.config({
  criteria: Criteria,
  features: getFeatures,
  reload: 60, // Reload features every 60 seconds
  maxCookieAge: 31 * 86400 * 1000,
  useVetoVoting: true
});

module.exports = [
  fflip.express_middleware,
  function(req, res, next) {
    // Only logged in users get features
    if (!req.user) return next();

    req.fflip.setForUser({ user: req.user, req: req });
    next();
  }
];
