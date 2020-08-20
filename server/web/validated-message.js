'use strict';

var env = require('gitter-web-env');
var config = env.config;
var crypto = require('crypto');

var secret = config.get('web:messageSecret');

function validate(unvalidatedMessage, check, defaultMessage) {
  if (!unvalidatedMessage || !check) {
    return defaultMessage;
  }

  unvalidatedMessage = String(unvalidatedMessage);
  check = String(check);
  var p = check.split(':');
  if (p.length !== 2) {
    return defaultMessage;
  }

  var checksum = p[0];
  var salt = p[1];

  var calculatedCheck = crypto
    .createHash('md5')
    .update(secret + salt + unvalidatedMessage, 'utf8')
    .digest('base64');

  if (calculatedCheck === checksum) {
    return unvalidatedMessage;
  }

  return defaultMessage;
}

function getCheck(message) {
  if (!message) return '';

  var salt = crypto.randomBytes(6).toString('base64');

  var check = crypto
    .createHash('md5')
    .update(secret + salt + message, 'utf8')
    .digest('base64');

  return check + ':' + salt;
}

module.exports = {
  validate: validate,
  getCheck: getCheck
};
