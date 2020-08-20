'use strict';

var makeBenchmark = require('../make-benchmark');
var Backbone = require('backbone');

var m = new Backbone.Model({ a: true });

makeBenchmark({
  tests: {
    'straight-set': function() {
      m.set('a', true);
    },

    'optimised-set': function() {
      var a = m.get('a');
      if (a !== true) {
        m.set('a', true);
      }
    }
  }
});
