'use strict';

var passport = require('passport');
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var BearerStrategy = require('gitter-passport-http-bearer').Strategy;
var userService = require('gitter-web-users');
var oauthService = require('gitter-web-oauth');

const env = require('gitter-web-env');
const config = env.config;
const logger = env.logger;

function installApi() {
  /**
   * BearerStrategy
   *
   * This strategy is used to authenticate users based on an access token (aka a
   * bearer token).  The user must have previously authorized a client
   * application, which is issued an access token to make requests on behalf of
   * the authorizing user.
   */

  /* This is ONLY used to API clients, not WEB clients!! */
  passport.use(
    new BearerStrategy(function(accessToken, done) {
      return oauthService
        .validateAccessTokenAndClient(accessToken)
        .then(function(tokenInfo) {
          // Token not found
          if (!tokenInfo) return;

          var user = tokenInfo.user;
          var client = tokenInfo.client;

          if (!client) return;

          if (!user || user.isRemoved()) {
            /* This will be converted to null in auth-api.js */
            user = { _anonymous: true };
          }

          return [user, { client: client, accessToken: accessToken }];
        })
        .asCallback(done, { spread: true });
    })
  );
}

function install() {
  passport.serializeUser(function(user, done) {
    var serializedId = user.id || (user._id && user._id.toHexString());
    done(null, serializedId);
  });

  passport.deserializeUser(function deserializeUserCallback(id, done) {
    return userService
      .findById(id)
      .then(function(user) {
        if (user && (user.state === 'DISABLED' || user.isRemoved())) {
          return null;
        }

        return user;
      })
      .asCallback(done);
  });

  /* OAuth Strategies */

  /**
   * BasicStrategy & ClientPasswordStrategy
   *
   * These strategies are used to authenticate registered OAuth clients.  They are
   * employed to protect the `token` endpoint, which consumers use to obtain
   * access tokens.  The OAuth 2.0 specification suggests that clients use the
   * HTTP Basic scheme to authenticate.  Use of the client password strategy
   * allows clients to send the same credentials in the request body (as opposed
   * to the `Authorization` header).  While this approach is not recommended by
   * the specification, in practice it is quite common.
   */

  passport.use(
    new ClientPasswordStrategy(function(clientKey, clientSecret, done) {
      return oauthService
        .findClientByClientKey(clientKey)
        .then(function(client) {
          if (!client) return false;
          if (client.clientSecret !== clientSecret) return false;

          return client;
        })
        .asCallback(done);
    })
  );

  /* Install the API OAuth strategy too */
  installApi();

  // generalizing based on a single config, in the future we might want to allow more granular passport initialization
  const githubOAuthConfigured = Boolean(config.get('github:user_client_id'));
  const isDev = process.env.NODE_ENV === 'dev';
  // in other words we allow skipping setting up the external strategies if we are running the webapp locally and secrets are missing
  if (isDev && !githubOAuthConfigured) {
    logger.warn(
      'Your OAuthSecrets are not set. Skipping OAuth setup for local development.',
      'Follow readme instructions to set your OAuth https://gitlab.com/gitlab-org/gitter/webapp#configure-oauth-and-service-secrets'
    );
    return;
  }
  var githubUserStrategy = require('./strategies/github-user');
  var githubUpgradeStrategy = require('./strategies/github-upgrade');
  var gitlabStrategy = require('./strategies/gitlab');
  var twitterStrategy = require('./strategies/twitter');
  passport.use(githubUserStrategy);
  passport.use(githubUpgradeStrategy);
  passport.use(gitlabStrategy);
  passport.use(twitterStrategy);
}

module.exports = {
  installApi: installApi,
  install: install
};
