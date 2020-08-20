'use strict';

var apn = require('apn');
var notificationMessageGenerator = require('../notification-message-generator');

function generateNewChatNotifications(notificationType, notificationDetails /*, device*/) {
  var room = notificationDetails.room;
  var chats = notificationDetails.chats;
  var hasMentions = notificationDetails.hasMentions;
  var badgeCount = notificationDetails.badgeCount;
  var message = notificationMessageGenerator(room, chats);

  var note = new apn.Notification();

  if (badgeCount >= 0) {
    note.badge = badgeCount;
  }

  note.setAlertText(message);
  note.sound = hasMentions ? 'notify.caf' : 'notify-2.caf';
  note.category = 'NEW_CHAT';
  note.payload = {
    aps: {
      'content-available': 1,
      l: '/mobile/chat#' + room.id
    }
  };

  return note;
}

function generateNotifications(notificationType, notificationDetails, device) {
  switch (notificationType) {
    case 'new_chat':
      return generateNewChatNotifications(notificationType, notificationDetails, device);
  }
}

module.exports = generateNotifications;
