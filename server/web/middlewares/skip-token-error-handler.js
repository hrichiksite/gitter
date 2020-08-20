'use strict';

module.exports = function(req, res, next) {
  req.skipTokenErrorHandler = true;
  return next();
};
