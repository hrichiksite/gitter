'use strict';

var isPhone = require('../is-phone');

function isPhoneMiddleware(req, res, next) {
  req.isPhone = isPhone(req);
  next();
}

module.exports = isPhoneMiddleware;
