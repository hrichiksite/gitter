'use strict';

var env = require('gitter-web-env');
var nconf = env.config;

module.exports = env.createStatsClient({
  prefix: nconf.get('stats:statsd:prefix') + 'serializer.'
});
