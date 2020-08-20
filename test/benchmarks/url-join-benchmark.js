'use strict';

var makeBenchmark = require('../make-benchmark');
var urljoin = require('url-join');

var user = { username: 'suprememoocow' };

makeBenchmark({
  tests: {
    strings: function() {
      var x = '/' + user.username;
      return x;
    },

    urlJoin: function() {
      var x = urljoin('/', user.username);
      return x;
    }
  }
});
