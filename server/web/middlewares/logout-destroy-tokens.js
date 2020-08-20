'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;
var StatusError = require('statuserror');

var logout = require('./logout');
var oauthService = require('gitter-web-oauth');
var userService = require('gitter-web-users');

module.exports = function(req, res, next) {
  var user = req.user;
  var userId = user && user.id;
  var username = user && user.username;

  logger.warn('logout-destroy-tokens: performing logout', {
    userId: userId,
    username: username
  });

  stats.event('logout_destroy_user_tokens', { userId: userId, username: username });

  if (req.session) {
    logout(req, res, postLogout);
  } else {
    postLogout();
  }

  function send() {
    // Are we dealing with an API client? Tell em in HTTP
    if (req.accepts(['json', 'html']) === 'json') {
      logger.error('User no longer has a token');
      res.status(401).send({ success: false, loginRequired: true });
      return;
    }

    /* Not a web client? Give them the message straightup */
    if (req.headers.authorization) {
      return next(new StatusError(401));
    }

    return res.relativeRedirect('/');
  }

  function postLogout(err) {
    if (err) logger.warn('Unable to log user out');

    if (!user) return send(req, res, next);
    var userId = user._id;

    userService
      .destroyTokensForUserId(userId)
      .catch(function(err) {
        logger.error('Unable to destroy tokens for user: ' + err, { exception: err });
      })
      .then(function() {
        return oauthService.removeAllAccessTokensForUser(userId);
      })
      .catch(function(err) {
        logger.error('Unable to remove access tokens: ' + err, { exception: err });
      })
      .then(function() {
        send(req, res, next);
        return null;
      });
  }
};
