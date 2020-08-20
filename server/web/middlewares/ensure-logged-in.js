'use strict';

var loginRequired = require('./login-required');

module.exports = function(req, res, next) {
  if (req.user) {
    return next();
  }

  loginRequired(req, res, next);
};
