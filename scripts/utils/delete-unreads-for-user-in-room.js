#!/usr/bin/env node
'use strict';

// This will clear all unreads and mentions for a given user and room URI

const userService = require('gitter-web-users');
const unreadItemService = require('gitter-web-unread-items');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const readline = require('readline');
const shutdown = require('shutdown');

require('../../server/event-listeners').install();

const opts = require('yargs')
  .option('username', {
    alias: 'u',
    required: true,
    description: 'User you want to remove the unreads/mentions for'
  })
  .option('room-uri', {
    alias: 'r',
    required: true,
    description: 'Room URI where the unread item exists'
  })
  .help('help')
  .alias('help', 'h').argv;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function promptBeforeDeletion(unreads) {
  return new Promise(function(resolve, reject) {
    rl.question(
      `Are you sure you want to delete ${unreads.chat.length} unreads and ${
        unreads.mention.length
      } mentions? (yes/no)\n${JSON.stringify(unreads, null, '\t')}`,
      function(answer) {
        rl.close();
        console.log(`Answered: ${answer}`);

        if (answer === 'yes') {
          resolve();
        } else {
          reject(new Error('Answered no'));
        }
      }
    );
  });
}

async function exec() {
  const user = await userService.findByUsername(opts.username);
  const room = await troupeService.findByUri(opts.roomUri);

  const unreadItems = await unreadItemService.getUnreadItemsForUser(user.id, room.id);
  await promptBeforeDeletion(unreadItems);

  await unreadItemService.ensureAllItemsRead(user.id, room.id);
}

exec()
  .then(() => {
    console.log('done');
    shutdown.shutdownGracefully();
  })
  .catch(err => {
    console.error(err);
    console.error(err.stack);
    shutdown.shutdownGracefully();
  });
