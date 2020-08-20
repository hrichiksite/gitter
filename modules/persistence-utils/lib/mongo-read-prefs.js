'use strict';

var env = require('gitter-web-env');
var config = env.config;

var secondaryPreferred;

// In tests, reading from a secondary plays havoc with
// timing, since you never know when the data will be
// eventually consistent. So, for that reason, in test-fixtures
// we only read off primaries
if (process.env.GITTER_TEST || config.get('mongo:onlyUsePrimary')) {
  secondaryPreferred = 'primary';
} else {
  secondaryPreferred = 'secondaryPreferred';
}

module.exports = {
  secondaryPreferred: secondaryPreferred
};
