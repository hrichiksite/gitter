#!/usr/bin/env node
/*jslint node:true, unused:true */
'use strict';

var Promise = require('bluebird');
var shutdown = require('shutdown');
var avatars = require('gitter-web-avatars');
var userService = require('gitter-web-users');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
const chatService = require('gitter-web-chats');
var emailNotificationService = require('gitter-web-email-notifications');
const serializer = require('../../server/serializers/notification-serializer');

var opts = require('yargs')
  .option('username', {
    alias: 'u',
    required: true,
    description: 'username of user to send email to',
    string: true
  })
  .option('room-uri', {
    alias: 'r',
    required: true,
    description: 'A list of rooms to be added.',
    type: 'array'
  })
  .option('dummy', {
    type: 'boolean',
    description: 'Should send a dummy fake message instead of a real message',
    default: true
  })
  .help('help')
  .alias('help', 'h').argv;

async function getMessages(troupe, returnDummyMessage) {
  if (returnDummyMessage) {
    return [
      {
        text: 'Test message',
        fromUser: {
          username: 'Some user',
          avatarUrlSmall: avatars.getDefault()
        }
      }
    ];
  }
  return chatService.findChatMessagesForTroupe(troupe.id || troupe._id, { limit: 3 });
}

async function sendNotification() {
  const user = await userService.findByUsername(opts.username);
  const rooms = await troupeService.findByUris(opts.roomUri);

  const roomStrategy = new serializer.TroupeStrategy({ recipientUserId: user.id });
  const serialiazedRooms = await serializer.serialize(rooms, roomStrategy);

  const roomData = await Promise.all(
    serialiazedRooms.map(async room => {
      const chats = await getMessages(room, opts.dummy);

      const chatStrategy = new serializer.ChatStrategy({ recipientUserId: user.id });
      const serializedChats = await serializer.serialize(chats, chatStrategy);

      return {
        troupe: room,
        unreadCount: opts.roomUri.length,
        chats: serializedChats
      };
    })
  );
  const { fake } = await emailNotificationService.sendUnreadItemsNotification(user, roomData);
  console.log(`Using fake mailer? ${fake}`);
}
sendNotification()
  .catch(err => {
    console.log('err', err, err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
