'use strict';

/**
 * To enable plan debugging, use
 * DEBUG='gitter:serializer:tracing:plan'
 */
var debug = require('debug')('gitter:infra:serializer:tracing');

var env = require('gitter-web-env');
var nconf = env.config;
var stats = env.stats;
var statsd = require('./serialize-stats-client');

var maxSerializerTime = nconf.get('serializer:warning-period');

function reportOnStrategy(strat, start, n) {
  var statsPrefix = strat.strategyType
    ? 'serializer.' + strat.strategyType + '.' + strat.name
    : 'serializer.' + strat.name;

  statsd.histogram(statsPrefix + '.size', n, 0.1);

  var time = Date.now() - start;
  debug('strategy %s with %s items took %sms to complete', strat.name, n, time);
  statsd.timing(statsPrefix + '.timing', time, 0.1);

  if (time > maxSerializerTime) {
    stats.responseTime('serializer.slow.preload', time);
  }
}

module.exports = {
  reportOnStrategy: reportOnStrategy
};
