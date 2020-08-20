'use strict';

var _ = require('lodash');

function obfuscateToken(token) {
  token = token || '';
  return _.repeat('*', token.length - 8) + token.slice(token.length - 8);
}

module.exports = obfuscateToken;
