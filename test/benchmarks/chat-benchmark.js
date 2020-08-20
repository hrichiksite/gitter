'use strict';

var makeBenchmark = require('../make-benchmark');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var chatService = require('gitter-web-chats');
var roomMembershipFlags = require('gitter-web-rooms/lib/room-membership-flags');

var fixture = {};
var count = 0;
makeBenchmark({
  maxTime: 30,
  before: function(done) {
    var fixtureDescription = {
      troupeSmall: { users: ['user1', 'user2', 'user3'] },
      troupeBig: {
        users: [],
        membershipStrategy: function(userId, index) {
          switch (index % 3) {
            case 0:
              return {
                mode: roomMembershipFlags.MODES.all,
                lurk: false
              };

            case 1:
              return {
                mode: roomMembershipFlags.MODES.announcement,
                lurk: true
              };

            case 2:
              return {
                mode: roomMembershipFlags.MODES.mute,
                lurk: true
              };
          }
        }
      }
    };

    for (var i = 0; i < 10000; i++) {
      fixtureDescription['user' + i] = {};
      fixtureDescription.troupeBig.users.push('user' + i);
    }
    // userOnlyOne is in one room
    // user0...5000 are in two or three rooms
    return fixtureLoader.manual(fixture, fixtureDescription, null).asCallback(done);
  },

  after: function(done) {
    fixture.cleanup(done);
  },

  tests: {
    // 'newChatMessageToTroupe#troupeSmall': function(done) {
    //   chatService.newChatMessageToTroupe(fixture.troupeSmall, fixture.user1, { text: 'This is a message'})
    //     .nodeify(done);
    // },

    'newChatMessageToTroupeWithDelete#troupeBig': function(done) {
      count++;
      chatService
        .newChatMessageToTroupe(fixture.troupeBig, fixture.user1, {
          text: 'This is a message: ' + count
        })
        .delay(100)
        .then(function(chat) {
          return chatService.deleteMessageFromRoom(fixture.troupeBig, chat);
        })
        .nodeify(done);
    }
  }
});
