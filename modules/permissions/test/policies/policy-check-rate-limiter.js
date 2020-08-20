'use strict';

var assert = require('assert');
var policyCheckRateLimiter = require('../../lib/policies/policy-check-rate-limiter');

describe('policy-check-rate-limiter', function() {
  describe('integration tests #slow', function() {
    it('should not return false positives', function() {
      return policyCheckRateLimiter
        .checkForRecentSuccess('test:' + Date.now())
        .then(function(result) {
          assert.strictEqual(result, false);
        });
    });

    it('should return positives', function() {
      var key = 'test:' + Date.now();
      return policyCheckRateLimiter
        .recordSuccessfulCheck(key, 5)
        .then(function() {
          return policyCheckRateLimiter.checkForRecentSuccess(key);
        })
        .then(function(result) {
          assert.strictEqual(result, true);
        });
    });
  });
});
