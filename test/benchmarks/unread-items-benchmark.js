'use strict';

var makeBenchmark = require('../make-benchmark');
var testRequire = require('../integration/test-require');
var mockito = require('jsmockito').JsMockito;
var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

var TOTAL_USERS = 10000;

var chatId;
var troupeId;
var fromUserId;
var userIds;
var roomMembershipService;
var appEvents;
var userService;
var chatWithNoMentions;
var unreadItemService;
var troupe;
var troupeLurkersUserHash;

makeBenchmark({
  before: function() {
    troupeId = mongoUtils.getNewObjectIdString() + '';
    chatId = mongoUtils.getNewObjectIdString() + '';
    fromUserId = mongoUtils.getNewObjectIdString() + '';
    userIds = [];
    troupeLurkersUserHash = {};
    for (var i = 0; i < TOTAL_USERS; i++) {
      var id = mongoUtils.getNewObjectIdString() + '';
      userIds.push(id);
      troupeLurkersUserHash[id] = false; // Not lurking
    }

    chatWithNoMentions = {
      id: chatId,
      mentions: []
    };

    troupe = {
      id: troupeId,
      _id: troupeId
    };

    userService = mockito.mock(testRequire('gitter-web-users'));
    appEvents = mockito.mock(testRequire('gitter-web-appevents'));

    mockito
      .when(roomMembershipService)
      .findMembersForRoomWithLurk(troupeId)
      .thenReturn(Promise.resolve(troupeLurkersUserHash));

    unreadItemService = testRequire.withProxies('gitter-web-unread-items', {
      'gitter-web-rooms/lib/room-membership-service': roomMembershipService,
      'gitter-web-users': userService,
      '../app-events': appEvents
    });
    unreadItemService.testOnly.setSendBadgeUpdates(false);
  },

  after: function(done) {
    if (process.env.DISABLE_EMAIL_NOTIFY_CLEAR_AFTER_TEST) return done();

    var unreadItemServiceEngine = testRequire('gitter-web-unread-items/lib/engine');
    unreadItemServiceEngine.testOnly.removeAllEmailNotifications().nodeify(done);
  },

  tests: {
    'createChatUnreadItems#largeRoom': function(done) {
      unreadItemService.createChatUnreadItems(fromUserId, troupe, chatWithNoMentions).nodeify(done);
    }
  }
});
