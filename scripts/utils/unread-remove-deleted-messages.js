#!/usr/bin/env node
/*jslint node:true, unused:true */
'use strict';

var Promise = require('bluebird');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var unreadItemService = require('gitter-web-unread-items');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var persistence = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var shutdown = require('shutdown');
var shimPositionOption = require('../yargs-shim-position-option');

// require('../../server/event-listeners').install();

var opts = require('yargs')
  .option(
    'uri',
    shimPositionOption({
      position: 0,
      required: true,
      description: 'uri of room, eg: gitterHQ/gitter'
    })
  )
  .option('dryRun', {
    type: 'boolean',
    description: 'Dry run'
  })
  .help('help')
  .alias('help', 'h').argv;

async function main(uri, dryRun) {
  const room = await troupeService.findByUri(uri);
  const userIds = await roomMembershipService.findMembersForRoom(room._id);

  console.log('QUERYING unread items for ', userIds.length, 'users');
  var allUnread = {};
  await Promise.map(
    userIds,
    function(userId) {
      return unreadItemService.getUnreadItems(userId, room._id).then(function(items) {
        items.forEach(function(chatId) {
          allUnread[chatId] = true;
        });
      });
    },
    { concurrency: 5 }
  );

  var ids = mongoUtils.asObjectIDs(Object.keys(allUnread));
  console.log('SEARCHING FOR ', ids.length, 'chat messages');

  const chatMap = {};
  const missingUnreads = Object.assign({}, allUnread);

  await Promise.all([
    // Find which messages actually exist
    persistence.ChatMessage.find({ _id: { $in: ids } })
      .lean(true)
      .exec()
      .then(function(chats) {
        chats.forEach(function(chat) {
          chatMap[chat._id.toString()] = chat;
          // Since the message exists, remove it from our tracking list
          delete missingUnreads[chat._id.toString()];
        });
      }),

    // Populate our map with information for deleted messages
    persistence.ChatMessageBackup.find({ _id: { $in: ids } })
      .lean(true)
      .exec()
      .then(function(chats) {
        chats.forEach(function(chat) {
          chatMap[chat._id.toString()] = chat;
        });
      })
  ]);

  var missingIds = Object.keys(missingUnreads);
  console.log(`MISSING ${missingIds.length} chatmessages that appeared in unreads: `, missingIds);

  if (dryRun) {
    console.log('Dry-run, nothing deleted');
    return;
  }

  if (!missingIds.length) {
    console.log('Nothing missing...');
    return;
  }

  return Promise.map(
    missingIds,
    function(itemId) {
      console.log('REMOVING ', itemId);

      // Remove the items, slowly
      return unreadItemService
        .removeItem(chatMap[itemId].fromUserId, room, chatMap[itemId])
        .delay(10);
    },
    { concurrency: 1 }
  );
}

Promise.resolve(main(opts.uri, opts.dryRun))
  .delay(1000)
  .catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
