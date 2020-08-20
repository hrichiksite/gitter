'use strict';

var testRequire = require('../test-require');

var estimatedChatsService = testRequire('./services/estimated-chats-service');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('estimatedChatsService', function() {
  describe('integration tests #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      troupe1: { users: ['user1'] },
      troupe2: {},
      message1: {
        user: 'user1',
        troupe: 'troupe1',
        text: 'old_message',
        sent: new Date('01/01/2014')
      },
      message2: {
        user: 'user1',
        troupe: 'troupe2',
        text: 'new_message',
        sent: new Date()
      }
    });

    describe('getEstimatedMessageCountForRoomId', function() {
      it('should return a value', function() {
        return estimatedChatsService
          .getEstimatedMessageCountForRoomId(fixture.troupe1._id)
          .then(function(count) {
            assert(count === 0 || count === 1);
          });
      });
    });

    describe('getEstimatedMessageCountForRoomIds', function() {
      it('should return a value for multiple rooms', function() {
        return estimatedChatsService
          .getEstimatedMessageCountForRoomIds([fixture.troupe1._id, fixture.troupe2._id])
          .then(function(counts) {
            assert(counts);
            assert(counts[fixture.troupe1.id] === undefined || counts[fixture.troupe1.id] === 1);
            assert(counts[fixture.troupe2.id] === undefined || counts[fixture.troupe2.id] === 1);
          });
      });

      it('should return a value for a single room', function() {
        return estimatedChatsService
          .getEstimatedMessageCountForRoomIds([fixture.troupe1._id])
          .then(function(counts) {
            assert(counts);
            assert(typeof counts === 'object');
            assert(counts[fixture.troupe1.id] === undefined || counts[fixture.troupe1.id] === 1);
          });
      });
    });
  });
});
