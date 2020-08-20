'use strict';

var crypto = require('crypto');
var Promise = require('bluebird');

// Token length in bytes. 20 byts == 40 hex chars
var tokenLength = 20;
var shortTokenLength = 4;

function generateTokenOfLength(length, cb) {
  return Promise.fromCallback(function(callback) {
    crypto.randomBytes(length, callback);
  })
    .then(function(buf) {
      return buf.toString('hex');
    })
    .nodeify(cb);
}
// Generate a cryptographically secure random token
exports.generateToken = function(cb) {
  return generateTokenOfLength(tokenLength, cb);
};

// Generate a cryptographically secure random token
exports.generateShortToken = function(cb) {
  return generateTokenOfLength(shortTokenLength, cb);
};
