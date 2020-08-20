'use strict';

var pushNotificationFilter = require('gitter-web-push-notification-filter');
var pushNotificationGateway = require('../../gateways/push-notification-gateway');
var serializer = require('../../serializers/notification-serializer');
var unreadItemService = require('gitter-web-unread-items');
var debug = require('debug')('gitter:app:push-notification-generator');
var Promise = require('bluebird');
var _ = require('lodash');

var MAX_MESSAGES_FOR_NOTIFICATION = 3;

function serializeItems(troupeId, recipientUserId, chatIds) {
  var troupeStrategy = new serializer.TroupeIdStrategy({ recipientUserId: recipientUserId });
  var chatStrategy = new serializer.ChatIdStrategy();

  return Promise.all([
    serializer.serializeObject(troupeId, troupeStrategy),
    serializer.serialize(chatIds, chatStrategy)
  ]);
}

/**
 * Given a set of unread items and mentions, return `n` items
 * which will be presented to the user in the push notification
 */
function selectChatsForNotification(unreadItems, mentions) {
  // Trivial case: there are three or less unread items, send them immediately
  if (unreadItems.length <= MAX_MESSAGES_FOR_NOTIFICATION) return unreadItems;

  unreadItems.sort(); // Default sorting works fine with mongoids

  // Simple case: there are no mentions. Just send the first three unread items
  if (!mentions.length) {
    return unreadItems.slice(0, MAX_MESSAGES_FOR_NOTIFICATION);
  }

  // Mentions case: get the first mention and then get the two closest unread items
  // to that mention (ie, the two before, the two around or the two after)
  var firstMention = _.min(mentions);
  var indexOfFirstMention = unreadItems.indexOf(firstMention);
  if (indexOfFirstMention <= 0) {
    /* This should never happen. Things are broken. Failback */
    return unreadItems.slice(0, MAX_MESSAGES_FOR_NOTIFICATION);
  }

  if (indexOfFirstMention === unreadItems.length - 1) {
    /* Mention is the last message */
    return unreadItems.slice(-MAX_MESSAGES_FOR_NOTIFICATION);
  }

  return unreadItems
    .slice(indexOfFirstMention - Math.floor(MAX_MESSAGES_FOR_NOTIFICATION / 2))
    .slice(0, MAX_MESSAGES_FOR_NOTIFICATION);
}

function notifyUserOfActivitySince(userId, troupeId, since, notificationNumber) {
  debug(
    'notifyUserOfActivitySince userId=%s, troupeId=%s, since=%s, notificationNumber=%s',
    userId,
    troupeId,
    since,
    notificationNumber
  );

  return unreadItemService
    .getUnreadItemsForUserTroupeSince(userId, troupeId, since)
    .spread(function(unreadItems, mentions) {
      // mentions should always be a subset of unreadItems
      if (!unreadItems.length) {
        debug('User %s has no unread items since %s in troupeId=%s', userId, since, troupeId);
        return;
      }

      var chatIdsForNotification = selectChatsForNotification(unreadItems, mentions);

      return serializeItems(troupeId, userId, chatIdsForNotification).spread(function(
        troupe,
        chats
      ) {
        if (!troupe || !chats || !chats.length) return;

        return pushNotificationGateway.sendUserNotification('new_chat', userId, {
          room: troupe,
          chats: chats,
          hasMentions: !!(mentions && mentions.length)
        });
      });
    });
}

function sendUserTroupeNotification(
  userId,
  troupeId,
  notificationNumber,
  userNotifySetting /*, mentioned*/
) {
  return pushNotificationFilter
    .canUnlockForNotification(userId, troupeId, notificationNumber)
    .then(function(startTime) {
      if (!startTime) {
        debug(
          'Unable to obtain lock to notify %s for user %s troupe %s. Skipping',
          notificationNumber,
          userId,
          troupeId
        );
        return;
      }

      // TODO: remove this....
      if (userNotifySetting === 'mute') {
        /* Mute this troupe for this user */
        return;
      }

      return notifyUserOfActivitySince(
        userId,
        troupeId,
        startTime,
        notificationNumber,
        userNotifySetting
      );
    });
}

module.exports.sendUserTroupeNotification = sendUserTroupeNotification;
module.exports.testOnly = {
  selectChatsForNotification: selectChatsForNotification,
  serializeItems: serializeItems
};
