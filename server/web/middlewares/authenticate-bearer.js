'use strict';

var StatusError = require('statuserror');
var oauthService = require('gitter-web-oauth');
var validateUserAgentFromReq = require('../validate-user-agent-from-req');
var checkAlreadyOnUnauthorizedUrl = require('../../utils/check-already-on-unauthorized-url');
const getAccessToken = require('../get-access-token-from-req');
const passportLogin = require('../passport-login');

/**
 *
 */
module.exports = function(req, res, next) {
  /* No access token? Continue! */
  var accessToken = getAccessToken(req);

  // Avoid a redirect loop even when someone is forcing a token via
  // `?access_token=xxxtoken` query parameter or `Authorization: bearer xxxtoken` header
  var alreadyOnUnauthorizedUrl = checkAlreadyOnUnauthorizedUrl(req.url);
  if (!accessToken || alreadyOnUnauthorizedUrl) return next();

  validateUserAgentFromReq(req)
    .then(() => oauthService.validateAccessTokenAndClient(accessToken))
    .then(function(tokenInfo) {
      // Token not found
      if (!tokenInfo) return next(new StatusError(401, 'Token not found'));

      // Anonymous tokens cannot be used for Bearer tokens
      if (!tokenInfo.user)
        return next(new StatusError(401, 'Anonymous tokens cannot be used for Bearer tokens'));

      var user = tokenInfo.user;
      var client = tokenInfo.client;
      return passportLogin(req, user).then(() => {
        req.authInfo = { client: client, accessToken: accessToken };
        next();
      });
    })
    .catch(next);
};
