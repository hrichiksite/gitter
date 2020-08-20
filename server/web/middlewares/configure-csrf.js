'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var debug = require('debug')('gitter:infra:configure-csrf');
var oauthService = require('gitter-web-oauth');
var validateUserAgentFromReq = require('../validate-user-agent-from-req');

function setAccessToken(req, userId, accessToken) {
  if (req.session) {
    req.session['accessToken_' + (userId ? userId : '')] = accessToken;
  }

  req.accessToken = accessToken;
}

function getSessionAccessToken(req, userId) {
  if (req.session) {
    return req.session['accessToken_' + (userId ? userId : '')];
  }
}

module.exports = function(req, res, next) {
  var userId = req.user && req.user.id;

  function generateAccessToken() {
    if (req.user) {
      debug('csrf: Using web token');
      stats.eventHF('token.authenticated.web');

      return oauthService
        .findOrGenerateWebToken(req.user.id)
        .spread(function(serverToken /*, client */) {
          setAccessToken(req, userId, serverToken);
          return null;
        });
    }

    debug('csrf: Generating new anonymous token');
    stats.eventHF('token.anonymous.generate');

    /* Generate an anonymous token */
    return oauthService.generateAnonWebToken().spread(function(token /*, client */) {
      setAccessToken(req, null, token);
      return null;
    });
  }

  return validateUserAgentFromReq(req)
    .then(() => {
      /* OAuth clients have req.authInfo. Propagate their access token to their entire session
       * so that all related web-requests are made by the same client
       */
      if (req.authInfo && req.authInfo.accessToken) {
        debug('csrf: Using OAuth access token');
        setAccessToken(req, userId, req.authInfo.accessToken);
        return;
      }

      var sessionAccessToken = getSessionAccessToken(req, userId);
      if (sessionAccessToken) {
        return oauthService
          .validateAccessTokenAndClient(sessionAccessToken)
          .then(function(tokenInfo) {
            if (!tokenInfo) {
              return generateAccessToken();
            }

            req.accessToken = sessionAccessToken;
          })
          .catch(function(err) {
            // We shouldn't try to regenerate something that was revoked
            if (err.clientRevoked) {
              throw err;
            }

            debug('csrf: OAuth access token validation failed: %j', err);
            // Refresh anonymous tokens
            return generateAccessToken();
          });
      }

      return generateAccessToken();
    })
    .asCallback(next);
};
