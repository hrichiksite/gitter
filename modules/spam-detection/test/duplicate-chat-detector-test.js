'use strict';

var assert = require('assert');
var duplicateChatDetector = require('../lib/duplicate-chat-detector');
var Promise = require('bluebird');

describe('duplicate-chat-detector', function() {
  describe('integration tests #slow', function() {
    it('should detect duplicates', function() {
      var FIXTURE = [false, false, false, false, false, false, false, false, false, false, true];
      var userId = Date.now();

      return Promise.each(FIXTURE, function(expected) {
        return duplicateChatDetector(userId, '01234567890123456789012').then(function(result) {
          assert.strictEqual(result, expected);
        });
      });
    });

    it('should not detect non-duplicates', function() {
      var FIXTURE = [];
      for (var i = 0; i < 100; i++) {
        FIXTURE.push(i);
      }
      var userId = Date.now();

      return Promise.each(FIXTURE, function(v, i) {
        return duplicateChatDetector(userId, 'This is the text ' + i).then(function(result) {
          assert.strictEqual(result, false);
        });
      });
    });
  });
});
