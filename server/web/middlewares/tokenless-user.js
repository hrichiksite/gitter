'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var logoutDestroyTokens = require('./logout-destroy-tokens');
var userScopes = require('gitter-web-identity/lib/user-scopes');

module.exports = function(req, res, next) {
  var user = req.user;
  if (user && userScopes.isMissingTokens(user)) {
    winston.warn('tokenless-user-middleware: authenticated user has no tokens, rejecting.', {
      username: user.username,
      userId: user.id
    });

    return logoutDestroyTokens(req, res, next);
  }
  return next();
};
