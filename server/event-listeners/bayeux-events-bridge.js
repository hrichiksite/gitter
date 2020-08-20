'use strict';

const assert = require('assert');
var env = require('gitter-web-env');
var nconf = env.config;
var Promise = require('bluebird');
var winston = env.logger;
var statsd = env.createStatsClient({ prefix: nconf.get('stats:statsd:prefix') });
var appEvents = require('gitter-web-appevents');
var bayeux = require('../web/bayeux');
var ent = require('ent');
var presenceService = require('gitter-web-presence');
var restSerializer = require('../serializers/rest-serializer');
var debug = require('debug')('gitter:app:bayeux-events-bridge');

var installed = false;

exports.install = function() {
  if (installed) return;
  installed = true;

  function publish(channel, message, channelType, operation, modelType) {
    debug('Publish on %s: %j', channel, message);

    var tags = ['channelType:' + channelType];
    if (operation) {
      tags.push('operation:' + operation);
    }
    if (modelType) {
      tags.push('modelType:' + modelType);
    }
    statsd.increment('bayeux.publish', 1, 0.1, tags);

    bayeux.publish(channel, message);
  }

  appEvents.onDataChange2(function(data) {
    var operation = data.operation;
    var model = data.model;
    var url = '/api/v1' + data.url;
    var type = data.type;

    switch (operation) {
      case 'create':
      case 'patch':
      case 'update':
      case 'remove':
        var message = {
          operation: operation,
          model: model
        };

        publish(url, message, 'dataChange2', operation, type);

        break;
      default:
        winston.error('Unknown operation', { operation: operation });
    }
  });

  async function cleanupSocketsForToken(token, userId) {
    assert(token);
    assert(userId);
    const socketIds = await presenceService.listAllSocketsForUser(userId);

    const sockets = await presenceService.getSockets(socketIds);

    for (let socketId of Object.keys(sockets)) {
      const socket = sockets[socketId];

      if (socket.token === token) {
        winston.info(
          `accessToken(${token}) deleted so we are closing associated realtime socket(${socketId})`
        );
        await bayeux.destroyClient(socketId);
      }
    }
  }

  appEvents.onTokenRevoked(async data => {
    const { token, userId } = data;

    // Cleanup any of the realtime sockets associated with the token that was just revoked/deleted
    await cleanupSocketsForToken(token, userId);

    const url = '/api/v1/token/' + token;
    const message = {
      notification: 'token_revoked'
    };
    debug('Token revoked on %s: %j', url, message);

    publish(url, message, 'tokenRevoked');
  });

  appEvents.onUserRemovedFromTroupe(async function(options) {
    var userId = options.userId;
    var troupeId = options.troupeId;
    const sockets = await presenceService.listAllSocketsForUser(userId);
    winston.info(`Unsubscribing all sockets belonging to user ${userId} from room ${troupeId}`);
    await Promise.all(sockets.map(socket => bayeux.unsubscribeFromTroupe(socket, troupeId)));
    winston.info(
      `All sockets belonging to user ${userId} have been unsubscribed from room ${troupeId}`
    );
  });

  appEvents.onUserNotification(function(data) {
    var userId = data.userId;
    var title = data.title;
    var text = data.text;
    var link = data.link;
    var icon = data.icon;
    var troupeId = data.troupeId;
    var sound = data.sound;
    var chatId = data.chatId;

    var url = '/api/v1/user/' + userId;
    var message = {
      notification: 'user_notification',
      title: title,
      text: ent.decode(text),
      link: link,
      icon: icon,
      troupeId: troupeId,
      sound: sound,
      chatId: chatId
    };
    debug('Notification to %s: %j', url, message);

    publish(url, message, 'onUserNotification');
  });

  // When a user's eyeballs changes to on or off...
  presenceService.on('presenceChange', function(userId, troupeId, presence) {
    publish(
      '/api/v1/rooms/' + troupeId,
      {
        notification: 'presence',
        userId: userId,
        status: presence ? 'in' : 'out'
      },
      'presenceChange'
    );
  });

  ////////////////////

  appEvents.onTroupeUnreadCountsChange(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var total = data.total;
    var mentions = data.mentions;

    // TODO: this is deprecated but still used by the OSX client
    publish(
      '/api/v1/user/' + userId,
      {
        notification: 'troupe_unread',
        troupeId: troupeId,
        totalUnreadItems: total,
        DEPRECATED: true
      },
      'troupeUnreadCountsChangeA'
    );

    if (mentions >= 0) {
      // TODO: this is deprecated but still used by the OSX client
      publish(
        '/api/v1/user/' + userId,
        {
          notification: 'troupe_mention',
          troupeId: troupeId,
          mentions: mentions,
          DEPRECATED: true
        },
        'troupeUnreadCountsChangeB'
      );
    }

    var url = '/api/v1/user/' + userId + '/rooms';
    var message = {
      operation: 'patch',
      model: {
        id: troupeId,
        unreadItems: total,
        mentions: mentions
      }
    };

    // Just patch the mention count
    publish(url, message, 'troupeUnreadCountsChange');
  });

  appEvents.onUserMentionedInNonMemberRoom(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    // User is not a member of the room but they're just been mentioned.
    // We need to send them a create to add the room to their collection
    var strategy = new restSerializer.TroupeIdStrategy({
      currentUserId: userId
    });

    var mentionUrl = '/api/v1/user/' + userId + '/rooms';

    restSerializer.serializeObject(troupeId, strategy).then(function(troupe) {
      // Simulate a create on the mentions resource
      publish(
        mentionUrl,
        {
          operation: 'create',
          model: troupe
        },
        'userMentionedInNonMemberRoom'
      );
    });
  });

  appEvents.onNewLurkActivity(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;

    publish(
      '/api/v1/user/' + userId,
      {
        notification: 'activity',
        troupeId: troupeId
      },
      'newLurkActivity'
    );
  });

  appEvents.onNewUnreadItem(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var items = data.items;
    var isOnline = data.online;

    // This event gets triggered for offline users too,
    // but we can ignore them
    if (!isOnline) return;

    publish(
      '/api/v1/user/' + userId + '/rooms/' + troupeId + '/unreadItems',
      {
        notification: 'unread_items',
        items: items
      },
      'newUnreadItem'
    );
  });

  appEvents.onUnreadItemsRemoved(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var items = data.items;

    publish(
      '/api/v1/user/' + userId + '/rooms/' + troupeId + '/unreadItems',
      {
        notification: 'unread_items_removed',
        items: items
      },
      'unreadItemsRemoved'
    );
  });

  appEvents.onUserTroupeLurkModeChange(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var lurk = data.lurk;

    publish(
      '/api/v1/user/' + userId + '/rooms/' + troupeId + '/unreadItems',
      {
        notification: 'lurk_change',
        lurk: lurk
      },
      'userTroupeLurkModeChange'
    );
  });

  appEvents.onMarkAllRead(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;

    publish(
      '/api/v1/user/' + userId + '/rooms/' + troupeId + '/unreadItems',
      {
        notification: 'mark_all_read'
      },
      'markAllRead'
    );
  });
};
