'use strict';

var assert = require('assert');
var chatSpamDetection = require('../lib/chat-spam-detection');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var User = require('gitter-web-persistence').User;

describe('chat-spam-detection', function() {
  describe('integration tests #slow', function() {
    var fixture = fixtureLoader.setupEach({
      user1: {}
    });

    it('should mark messages from hellbanned user as spam', async () => {
      fixture.user1.hellbanned = true;
      const isSpammy = await chatSpamDetection.detect(fixture.user1, {
        text: 'Message from a banned user'
      });
      assert(isSpammy);
    });

    it('should use duplicate chat detector', function() {
      var COUNTER = [];
      for (var i = 0; i < 12; i++) {
        COUNTER.push(i);
      }

      return Promise.each(COUNTER, function(v, index) {
        return chatSpamDetection
          .detect(fixture.user1, {
            text: '0123456789012345678912'
          })
          .then(function(isSpammy) {
            var expected = index >= 10;
            assert.strictEqual(isSpammy, expected);
          });
      })
        .then(function() {
          return User.findById(fixture.user1._id);
        })
        .then(function(user) {
          assert.strictEqual(user.hellbanned, true);
        });
    });
  });
});
