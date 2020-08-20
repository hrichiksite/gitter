'use strict';

function generateNewChatNotifications(notificationType, notificationDetails /*, device*/) {
  var room = notificationDetails.room;
  var chats = notificationDetails.chats;

  return {
    type: notificationType,
    linkUrl: room.url + '?utm_source=web-push-notification',
    room: {
      id: room.id,
      uri: room.uri,
      name: room.name || room.uri,
      oneToOne: room.oneToOne,
      url: room.url
    },
    chats: chats.map(function(chat) {
      var fromUser;

      if (chat.fromUser) {
        fromUser = {
          id: chat.fromUser.id,
          username: chat.fromUser.username,
          displayName: chat.fromUser.displayName,
          avatarUrl: chat.fromUser.avatarUrl
        };
      }
      return {
        id: chat.id,
        text: chat.text,
        sent: chat.sent,
        fromUser: fromUser
      };
    })
  };
}

function generateNotifications(notificationType, notificationDetails, device) {
  switch (notificationType) {
    case 'new_chat':
      return generateNewChatNotifications(notificationType, notificationDetails, device);
  }
}

module.exports = generateNotifications;
