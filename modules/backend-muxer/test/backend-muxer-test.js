'use strict';

var BackendMuxer = require('../lib/backend-muxer');
var assert = require('assert');
var Promise = require('bluebird');

describe('backend-muxer', function() {
  describe('getFirstResultForBackends', function() {
    var getFirstResultForBackends = BackendMuxer.testOnly.getFirstResultForBackends;
    var backend1, backend2, results;

    beforeEach(function() {
      results = [];
      backend1 = {
        backendFn: function() {
          return Promise.resolve(results[0]);
        }
      };
      backend2 = {
        backendFn: function() {
          return Promise.resolve(results[1]);
        }
      };
    });

    it('should handle zero backends', function() {
      var fn = getFirstResultForBackends('backendFn', []);
      return fn([]).then(function(result) {
        assert(!result);
      });
    });

    it('should handle a single backends', function() {
      var fn = getFirstResultForBackends('backendFn', []);
      results[0] = 1;
      return fn([backend1]).then(function(result) {
        assert.strictEqual(result, 1);
      });
    });

    it('should return the first backend if it returns a result', function() {
      var fn = getFirstResultForBackends('backendFn', []);
      results[0] = 1;
      results[1] = 2;
      return fn([backend1, backend2]).then(function(result) {
        assert.strictEqual(result, 1);
      });
    });

    it('should return the first second if the first does not return a result', function() {
      var fn = getFirstResultForBackends('backendFn', []);

      results[0] = 2;
      return fn([backend1, backend2]).then(function(result) {
        assert.strictEqual(result, 2);
      });
    });

    it('should return nothing if no backends return a result', function() {
      var fn = getFirstResultForBackends('backendFn', []);

      return fn([backend1, backend2]).then(function(result) {
        assert(!result);
      });
    });
  });

  describe('resolveUserBackends', function() {
    it('should return an empty array for an anonymous user', function() {
      var resolveUserBackends = BackendMuxer.testOnly.resolveUserBackends;
      return resolveUserBackends(null).then(function(backends) {
        assert.strictEqual(backends.length, 0);
      });
    });
  });
});
