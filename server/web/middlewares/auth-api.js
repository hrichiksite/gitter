'use strict';

var passport = require('passport');
var rateLimiter = require('./rate-limiter');
var logoutDestroyTokens = require('./logout-destroy-tokens');
var userScopes = require('gitter-web-identity/lib/user-scopes');

function ensureLoggedIn(req, res, next) {
  /* Bearer strategy must return a user. If the user is { _anonymous: true }, it should be null */
  if (req.user && req.user._anonymous) {
    req.user = null;
  }

  if (req.user && userScopes.isMissingTokens(req.user)) {
    return logoutDestroyTokens(req, res, next);
  }

  next();
}

module.exports = [
  passport.authenticate('bearer', { session: false, failWithError: true }),
  ensureLoggedIn,
  rateLimiter
];
