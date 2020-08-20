'use strict';

var Promise = require('bluebird');
var events = require('events');
var _ = require('lodash');
var debug = require('debug')('gitter:app:events');

// make sure that the promises returned by addListener time out, otherwise it
// might never clean up after itself even when your test times out
var LISTENER_TIMEOUT = 10000;

function makeEmitter() {
  var localEventEmitter = new events.EventEmitter();

  return {
    /* This is only good for testing */
    removeAllListeners: function() {
      localEventEmitter.removeAllListeners();
    },

    // this is really useful for testing
    addListener: function(eventName, expected) {
      var eventMatcher;

      var promise = new Promise(function(resolve) {
        eventMatcher = function(res) {
          // NOTE: We can't reject here, because there could be other events
          // with the same event name. Therefore it is best to just time out
          // the test.
          if (_.isMatch(res, expected)) {
            debug('match!: %j', res);
            resolve(res);
          } else {
            debug('No match: %j against %j', res, expected);
          }
        };
        localEventEmitter.on(eventName, eventMatcher);
      });

      return function() {
        return promise.timeout(LISTENER_TIMEOUT).finally(function() {
          localEventEmitter.removeListener(eventName, eventMatcher);
        });
      };
    },

    newUnreadItem: function(userId, troupeId, items, online) {
      localEventEmitter.emit('newUnreadItem', {
        userId: userId,
        troupeId: troupeId,
        items: items,
        online: online
      });
    },

    onNewUnreadItem: function(callback) {
      localEventEmitter.on('newUnreadItem', callback);
    },

    newOnlineNotification: function(troupeId, chatId, userIds) {
      localEventEmitter.emit('newOnlineNotification', troupeId, chatId, userIds);
    },

    onNewOnlineNotification: function(callback) {
      localEventEmitter.on('newOnlineNotification', callback);
    },

    newPushNotificationForChat: function(troupeId, chatId, userIds, mentioned) {
      localEventEmitter.emit('newPushNotificationForChat', troupeId, chatId, userIds, mentioned);
    },

    onNewPushNotificationForChat: function(callback) {
      localEventEmitter.on('newPushNotificationForChat', callback);
    },

    unreadItemsRemoved: function(userId, troupeId, items) {
      localEventEmitter.emit('unreadItemRemoved', {
        userId: userId,
        troupeId: troupeId,
        items: items
      });
    },

    onUnreadItemsRemoved: function(callback) {
      localEventEmitter.on('unreadItemRemoved', callback);
    },

    troupeUnreadCountsChange: function(data) {
      localEventEmitter.emit('troupeUnreadCountsChange', data);
    },

    onTroupeUnreadCountsChange: function(callback) {
      localEventEmitter.on('troupeUnreadCountsChange', callback);
    },

    troupeMentionCountsChange: function(data) {
      localEventEmitter.emit('troupeMentionCountsChange', data);
    },

    onTroupeMentionCountsChange: function(callback) {
      localEventEmitter.on('troupeMentionCountsChange', callback);
    },

    userMentionedInNonMemberRoom: function(data) {
      localEventEmitter.emit('userMentionedInNonMemberRoom', data);
    },

    onUserMentionedInNonMemberRoom: function(callback) {
      localEventEmitter.on('userMentionedInNonMemberRoom', callback);
    },

    // Deprecated
    newNotification: function(troupeId, userId, notificationText, notificationLink) {
      localEventEmitter.emit('newNotification', {
        troupeId: troupeId,
        userId: userId,
        notificationText: notificationText,
        notificationLink: notificationLink
      });
    },

    // Deprecated
    onNewNotification: function(callback) {
      localEventEmitter.on('newNotification', callback);
    },

    userNotification: function(options) {
      localEventEmitter.emit('userNotification', options);
    },

    // Deprecated
    onUserNotification: function(callback) {
      localEventEmitter.on('userNotification', callback);
    },

    dataChange2: function(url, operation, model, type) {
      localEventEmitter.emit('dataChange2', {
        url: url,
        operation: operation,
        model: model,
        type: type
      });
    },

    onDataChange2: function(callback) {
      localEventEmitter.on('dataChange2', callback);
    },

    tokenRevoked: function(data) {
      localEventEmitter.emit('tokenRevoked', data);
    },

    onTokenRevoked: function(callback) {
      localEventEmitter.on('tokenRevoked', callback);
    },

    userRemovedFromTroupe: function(options) {
      localEventEmitter.emit('userRemovedFromTroupe', options);
    },

    onUserRemovedFromTroupe: function(callback) {
      localEventEmitter.on('userRemovedFromTroupe', callback);
    },

    batchUserBadgeCountUpdate: function(data) {
      localEventEmitter.emit('batchUserBadgeCountUpdate', data);
    },

    onBatchUserBadgeCountUpdate: function(callback) {
      localEventEmitter.on('batchUserBadgeCountUpdate', callback);
    },

    repoPermissionsChangeDetected: function(uri, isPrivate) {
      localEventEmitter.emit('repo_perm_change', {
        uri: uri,
        isPrivate: isPrivate
      });
    },

    onRepoPermissionsChangeDetected: function(callback) {
      localEventEmitter.on('repo_perm_change', callback);
    },

    userTroupeLurkModeChange: function(data) {
      localEventEmitter.emit('user_troupe_lurk_mode_change', data);
    },

    onUserTroupeLurkModeChange: function(callback) {
      localEventEmitter.on('user_troupe_lurk_mode_change', callback);
    },

    newLurkActivity: function(data) {
      localEventEmitter.emit('new_lurk_activity', data);
    },

    onNewLurkActivity: function(callback) {
      localEventEmitter.on('new_lurk_activity', callback);
    },

    markAllRead: function(data) {
      localEventEmitter.emit('mark_all_read', data);
    },

    onMarkAllRead: function(callback) {
      localEventEmitter.on('mark_all_read', callback);
    },

    repoRenameDetected: function(oldFullname, newFullname) {
      localEventEmitter.emit('repo_rename_detected', oldFullname, newFullname);
    },

    onRepoRenameDetected: function(callback) {
      localEventEmitter.on('repo_rename_detected', callback);
    },

    destroyUserTokens: function(userId) {
      localEventEmitter.emit('destroy_user_tokens', userId);
    },

    onDestroyUserTokens: function(callback) {
      localEventEmitter.on('destroy_user_tokens', callback);
    },

    roomMemberPermCheckFailed: function(roomId, userId) {
      localEventEmitter.emit('room_membership_perm_check_failed', roomId, userId);
    },

    onRoomMemberPermCheckFailed: function(callback) {
      localEventEmitter.on('room_membership_perm_check_failed', callback);
    }
  };
}

var defaultListener = makeEmitter();

module.exports = defaultListener;
module.exports.testOnly = {
  makeEmitter: makeEmitter,
  addListener: function(eventName, expected) {
    return defaultListener.addListener(eventName, expected);
  },
  removeAllListeners: function() {
    defaultListener.removeAllListeners();
  }
};
