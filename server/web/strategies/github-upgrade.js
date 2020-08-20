'use strict';

var env = require('gitter-web-env');
var config = env.config;
var logger = env.logger;
var GitHubStrategy = require('passport-github2').Strategy;
var callbackUrlBuilder = require('./callback-url-builder');

function githubUpgradeCallback(req, accessToken, refreshToken, params, _profile, done) {
  var requestedScopes = params.scope.split(/,/);
  var scopeHash = requestedScopes.reduce(function(memo, v) {
    memo[v] = true;
    return memo;
  }, {});

  req.user.githubToken = accessToken;
  req.user.githubScopes = scopeHash;

  req.user.save(function(err) {
    if (err) {
      logger.error('passport: user save failed: ' + err, { exception: err });
      return done(err);
    }

    logger.info('passport: User updated with token');
    return done(null, req.user);
  });
}

var githubUpgradeStrategy = new GitHubStrategy(
  {
    clientID: config.get('github:client_id'),
    clientSecret: config.get('github:client_secret'),
    callbackURL: callbackUrlBuilder(),
    // Prevent CSRF by adding a state query parameter through the OAuth flow that is connected to the users session.
    // These options come from the `require('passport-oauth2').Strategy`,
    // https://github.com/jaredhanson/passport-oauth2/blob/master/lib/strategy.js
    state: true,
    skipUserProfile: true,
    passReqToCallback: true
  },
  githubUpgradeCallback
);

githubUpgradeStrategy.name = 'github_upgrade';

module.exports = githubUpgradeStrategy;
