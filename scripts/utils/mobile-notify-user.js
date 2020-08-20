#!/usr/bin/env node
'use strict';

const userService = require('gitter-web-users');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const chatService = require('gitter-web-chats');
const pushNotificationGateway = require('../../server/gateways/push-notification-gateway');
const serializer = require('../../server/serializers/notification-serializer');
const oneToOneRoomService = require('gitter-web-rooms/lib/one-to-one-room-service');
const shutdown = require('shutdown');
const Promise = require('bluebird');

const opts = require('yargs')
  .option('username', {
    description: 'username to look up e.g trevorah',
    required: true,
    string: true
  })
  .option('room-uri', {
    description: 'room uri for chat'
  })
  .option('other-user', {
    description: 'Other user'
  })
  .help('help')
  .alias('help', 'h').argv;

async function findRoom(user, opts) {
  if (opts.roomUri) {
    return troupeService.findByUri(opts.roomUri);
  }

  if (opts.otherUser) {
    const otherUser = await userService.findByUsername(opts.otherUser);
    return oneToOneRoomService.findOneToOneRoom(user._id, otherUser._id);
  }

  throw new Error('Require either other user or roomUri');
}

async function exec() {
  if (opts.username) {
    const user = await userService.findByUsername(opts.username).bind({});

    const room = await findRoom(user, opts);

    const chats = await chatService.findChatMessagesForTroupe(room._id, {
      limit: 2
    });
    var troupeStrategy = new serializer.TroupeIdStrategy({ recipientUserId: user._id });
    var chatStrategy = new serializer.ChatIdStrategy();

    const serializedRoom = await serializer.serializeObject(room._id, troupeStrategy);
    const serializedChats = await serializer.serialize(
      chats.map(function(x) {
        return x._id;
      }),
      chatStrategy
    );

    return pushNotificationGateway.sendUserNotification('new_chat', user.id, {
      chats: serializedChats,
      room: serializedRoom,
      hasMentions: false
    });
  } else {
    return Promise.try(function() {
      throw new Error('username or appleToken required');
    });
  }
}

exec()
  .catch(function(err) {
    console.error(err, err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
