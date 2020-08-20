/*jslint node: true, unused:true */
/*global describe:true, it: true */
'use strict';

var testRequire = require('../../test-require');
var Promise = require('bluebird');
var mockito = require('jsmockito').JsMockito;
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var times = mockito.Verifiers.times;
var once = times(1);

var SERIALIZED_ROOM = { id: 'serializedId', name: 'serializedName', url: 'serializedUrl' };
var SERIALIZED_CHATS = [
  {
    id: 'serializedChatId',
    text: 'serializedText',
    fromUser: { displayName: 'serializedFromUser' }
  }
];

var pushNotificationFilterStub = {
  canUnlockForNotification: function() {
    return Promise.resolve(Date.now());
  }
};

var unreadItemServiceStub = {
  getUnreadItemsForUserTroupeSince: function() {
    return Promise.resolve([['chat1234567890'], []]);
  }
};

var notificationSerializerStub = {
  TroupeIdStrategy: function() {
    this.name = 'troupeId';
  },
  ChatIdStrategy: function() {
    this.name = 'chatId';
  },
  serialize: function(item, strategy) {
    assert.strictEqual(strategy.name, 'chatId');
    return Promise.resolve(SERIALIZED_CHATS);
  },
  serializeObject: function(item, strategy) {
    assert.strictEqual(strategy.name, 'troupeId');
    return Promise.resolve(SERIALIZED_ROOM);
  }
};

describe('push notification generator service', function() {
  it('should send a notification', function() {
    var mockSendUserNotification = mockito.mockFunction();
    mockito
      .when(mockSendUserNotification)()
      .then(function() {
        return Promise.resolve();
      });

    var service = testRequire.withProxies('./services/notifications/push-notification-generator', {
      'gitter-web-push-notification-filter': pushNotificationFilterStub,
      '../../gateways/push-notification-gateway': {
        sendUserNotification: mockSendUserNotification
      },
      'gitter-web-unread-items': unreadItemServiceStub,
      '../../serializers/notification-serializer': notificationSerializerStub
    });

    return service.sendUserTroupeNotification('userId1234', '1234567890', 1).then(function() {
      mockito.verify(mockSendUserNotification, once)();
    });
  });

  it('should serialize troupes and chats correctly', function() {
    var mockSendUserNotification = function(notificationType, userId, options) {
      assert.strictEqual(notificationType, 'new_chat');
      assert.equal(userId, 'userId1234');
      assert.deepEqual(options, {
        room: SERIALIZED_ROOM,
        chats: SERIALIZED_CHATS,
        hasMentions: false
      });

      return Promise.resolve();
    };

    var service = testRequire.withProxies('./services/notifications/push-notification-generator', {
      'gitter-web-push-notification-filter': pushNotificationFilterStub,
      '../../gateways/push-notification-gateway': {
        sendUserNotification: mockSendUserNotification
      },
      'gitter-web-unread-items': unreadItemServiceStub,
      '../../serializers/notification-serializer': notificationSerializerStub
    });

    return service.sendUserTroupeNotification('userId1234', '1234567890', 1);
  });

  describe('selectChatsForNotification', function() {
    var service;

    before(function() {
      service = testRequire('./services/notifications/push-notification-generator');
    });

    it('should select the first two messages when there are two messages', function() {
      assert.deepEqual(service.testOnly.selectChatsForNotification(['1', '2'], []), ['1', '2']);
    });

    it('should select the first three messages when there are four messages', function() {
      assert.deepEqual(service.testOnly.selectChatsForNotification(['1', '2', '3', '4'], []), [
        '1',
        '2',
        '3'
      ]);
    });

    it('should select the first three messages when the first message is a mention', function() {
      assert.deepEqual(
        service.testOnly.selectChatsForNotification(['1', '2', '3', '4', '5'], ['1']),
        ['1', '2', '3']
      );
    });

    it('should select the last three messages when the last message is a mention', function() {
      assert.deepEqual(
        service.testOnly.selectChatsForNotification(['1', '2', '3', '4', '5'], ['5']),
        ['3', '4', '5']
      );
    });

    it('should select the two closest messages when the mention is in the middle', function() {
      assert.deepEqual(
        service.testOnly.selectChatsForNotification(['1', '2', '3', '4', '5'], ['3']),
        ['2', '3', '4']
      );
    });
  });

  describe('serializeItems #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      troupe1: { users: ['user1'] },
      message1: {
        user: 'user1',
        troupe: 'troupe1',
        readBy: [],
        text: 'foo',
        sent: new Date('2014-01-01T00:00:00.000Z')
      },
      message2: {
        user: 'user1',
        troupe: 'troupe1',
        readBy: [],
        text: 'bar',
        sent: new Date('2014-01-02T00:00:00.000Z')
      }
    });

    it('should serialize for troupe, user and chats', function() {
      var troupeId = fixture.troupe1.id;
      var recipientUserId = fixture.user1.id;
      var chatIds = [fixture.message1.id, fixture.message2.id];

      // bring in a fresh service so we don't get the stubbed serializer
      var service = testRequire('./services/notifications/push-notification-generator');
      return service.testOnly
        .serializeItems(troupeId, recipientUserId, chatIds)
        .spread(function(troupe, chats) {
          assert.equal(troupe.id, troupeId);
          assert.equal(chats[0].text, 'foo');
          assert.equal(chats[1].text, 'bar');
        });
    });
  });
});
