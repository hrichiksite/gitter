'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var logger = env.logger;

function parse(incoming) {
  if (!incoming) return;

  // Old way: just post an array
  if (Array.isArray(incoming)) {
    return { stats: incoming };
  }

  // New way: post a hash
  if (incoming.stats && Array.isArray(incoming.stats)) {
    return incoming;
  }
}

function handleStats(incomingStats) {
  var processed = parse(incomingStats);
  if (!processed) return;

  var tags;
  if (processed.features && Array.isArray(processed.features)) {
    tags = processed.features.map(function(feature) {
      return 'feature_' + feature + ':1';
    });
  }

  processed.stats.forEach(function(s) {
    if (!s) return;

    var stat = s.stat;

    if (!stat || typeof stat !== 'string' || !stat.match(/^[\w\-\.]{2,80}$/)) {
      /* Ignore */
      return;
    }

    var statsName = 'client.' + stat;
    if ('value' in s) {
      var value = s.value;
      if (typeof value !== 'number') return; /* Ignore */
      stats.gaugeHF(statsName, value, 0.1, tags);
      return;
    }

    if ('time' in s) {
      var time = s.time;
      if (typeof time !== 'number') return; /* Ignore */
      stats.responseTime(statsName, time, tags);
      return;
    }

    var count = s.count;
    if (count) {
      stats.eventHF(statsName, count || 1, 0.1, tags);
      return;
    }
  });
}

module.exports = function(req, res) {
  var stats = req.body;

  try {
    handleStats(stats);
  } catch (e) {
    logger.error('Problem dealing with stats: ' + e, { exception: e });
  }

  res.send('OK');
};
