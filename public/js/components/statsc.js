'use strict';
var _ = require('lodash');
var appEvents = require('../utils/appevents');
var apiClient = require('./api-client');
var log = require('../utils/log');
var context = require('gitter-web-client-context');
var debug = require('debug-proxy')('app:stats');

module.exports = (function() {
  var statQueue = [];
  var counters = {};

  function send() {
    var sendCounters = counters;
    counters = {};
    var sendQueue = statQueue;
    statQueue = [];

    sendQueue = sendQueue.concat(
      Object.keys(sendCounters).map(function(stat) {
        var result = { stat: stat };
        if (sendCounters[stat] > 0) {
          result.count = sendCounters[stat];
        }

        return result;
      })
    );

    if (!sendQueue.length) return;

    var body = {
      stats: sendQueue,
      features: context.getFeatures()
    };

    apiClient.priv.post('/statsc', body, { dataType: 'text' }).catch(function() {
      log.info('An error occurred while communicating stats');
    });
  }

  var throttledSend = _.throttle(send, 1000, { leading: false });

  appEvents.on('stats.event', function(stat) {
    debug('event: %s', stat);
    if (counters[stat]) {
      counters[stat]++;
    } else {
      counters[stat] = 1;
    }
    throttledSend();
  });

  appEvents.on('stats.gauge', function(stat, value) {
    debug('gauge: %s: %s', stat, value);
    statQueue.push({ stat: stat, value: value });
    throttledSend();
  });

  appEvents.on('stats.time', function(stat, time) {
    debug('time: %s: %sms', stat, time);
    statQueue.push({ stat: stat, time: time });
    throttledSend();
  });
})();
