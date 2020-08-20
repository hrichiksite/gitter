'use strict';

var readyByService = require('../lib/readby-service');
var persistenceService = require('gitter-web-persistence');
var collections = require('gitter-web-utils/lib/collections');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var assert = require('assert');

describe('readby-service', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    user2: {},
    message1: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'old_message',
      sent: new Date('01/01/2014')
    },
    message2: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'old_message',
      sent: new Date('01/01/2014')
    },
    message3: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'old_message',
      sent: new Date('01/01/2014')
    },
    troupe1: { users: ['user1', 'user2'] }
  });

  describe('batchUpdateReadbyBatch', function() {
    it('should batch update the readby for lots of chat messages', function() {
      var user1 = fixture.user1;
      var user2 = fixture.user2;
      var message1 = fixture.message1;
      var message2 = fixture.message2;

      return readyByService.testOnly
        .batchUpdateReadbyBatch(fixture.troupe1.id, [
          user1.id + ':' + message1.id,
          user2.id + ':' + message1.id,
          user1.id + ':' + message2.id
        ])
        .then(function() {
          return persistenceService.ChatMessage.find({
            _id: { $in: [message1._id, message2._id] }
          }).exec();
        })
        .then(function(chats) {
          var chatsById = collections.indexById(chats);
          var m1 = chatsById[message1.id];
          var m2 = chatsById[message2.id];

          assert.strictEqual(m1.readBy.length, 2);
          assert.strictEqual(m2.readBy.length, 1);
          assert(m1.readBy.indexOf(user1._id) >= 0);
          assert(m1.readBy.indexOf(user2._id) >= 0);
          assert(m2.readBy.indexOf(user1._id) >= 0);
        });
    });

    it('should handle sequential batches', function() {
      var user1 = fixture.user1;
      var user2 = fixture.user2;
      var message3 = fixture.message3;

      return readyByService.testOnly
        .batchUpdateReadbyBatch(fixture.troupe1.id, [user1.id + ':' + message3.id])
        .then(function() {
          return readyByService.testOnly.batchUpdateReadbyBatch(fixture.troupe1.id, [
            user2.id + ':' + message3.id
          ]);
        })
        .then(function() {
          return persistenceService.ChatMessage.findOne({ _id: message3._id }).exec();
        })
        .then(function(m3) {
          assert.strictEqual(m3.readBy.length, 2);
          assert(m3.readBy.indexOf(user1._id) >= 0);
          assert(m3.readBy.indexOf(user2._id) >= 0);
        });
    });
  });
});
