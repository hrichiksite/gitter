'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var logoutDestroyTokens = require('./logout-destroy-tokens');

/* Has to have four args */
module.exports = function(err, req, res, next) {
  if (!req.skipTokenErrorHandler && err && err.gitterAction === 'logout_destroy_user_tokens') {
    winston.info('token-error-handler: logout_destroy_user_tokens error caught');

    return logoutDestroyTokens(req, res, next);
  }

  return next(err);
};
