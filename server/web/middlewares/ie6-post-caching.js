'use strict';

module.exports = function(req, res, next) {
  if (
    req.method === 'POST' ||
    req.method === 'PUT' ||
    req.method === 'DELETE' ||
    req.method === 'PATCH'
  ) {
    res.set('Cache-Control', 'no-cache');
  }
  next();
};
