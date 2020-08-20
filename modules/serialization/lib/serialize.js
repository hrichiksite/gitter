'use strict';

var Promise = require('bluebird');
var Lazy = require('lazy.js');
var reportOnStrategy = require('./strategy-tracing').reportOnStrategy;

/**
 * Serialize some items using a strategy, returning a promise
 */
module.exports = Promise.method(function serialize(items, strat) {
  if (items === null || items === undefined) {
    return null;
  }

  if (!Array.isArray(items)) {
    throw new Error('serialize requires an array of values');
  }

  if (!items.length) {
    return [];
  }

  var start = Date.now();
  var seq = Lazy(items);

  return Promise.resolve(strat.preload(seq))
    .bind({
      strat: strat,
      n: items.length,
      seq: seq,
      start: start
    })
    .then(function() {
      var strat = this.strat;
      var seq = this.seq;
      var start = this.start;
      var n = this.n;

      reportOnStrategy(strat, start, n);

      var serialized = seq.map(strat.map.bind(strat)).filter(function(f) {
        return f !== undefined && f !== null;
      });

      if (strat.postProcess) {
        return strat.postProcess(serialized);
      } else {
        return serialized.toArray();
      }
    });
});
