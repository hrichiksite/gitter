#!/usr/bin/env node
'use strict';

const shutdown = require('shutdown');
const path = require('path');
const os = require('os');
const fsPromises = require('fs').promises;
const appendFile = fsPromises.appendFile;
const mkdtemp = fsPromises.mkdtemp;

const onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
const userService = require('gitter-web-users');
const chatService = require('gitter-web-chats');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const chatsForUserSearch = require('gitter-web-elasticsearch/lib/chats-for-user-search');

const opts = require('yargs')
  .option('username', {
    alias: 'u',
    required: true,
    description: 'Username of the user to remove',
    string: true
  })
  .option('limit', {
    alias: 'l',
    required: true,
    default: 100,
    description: 'Number of documents to find and delete'
  })
  .option('grep', {
    alias: 'g',
    description: 'The regex filter to match against the message text'
  })
  .option('dry', {
    type: 'boolean',
    default: false,
    description: 'Dry run: whether to actually delete the messages'
  })
  .help('help')
  .alias('help', 'h').argv;

const messageTextFilterRegex = opts.grep ? new RegExp(opts.grep, 'i') : null;

if (opts.dry) {
  console.log('Dry-run: nothing will be deleted/saved');
}

const makeBackup = async messages => {
  const now = new Date();
  const filename =
    'messages-' +
    opts.username +
    '-bak-' +
    now.getFullYear() +
    '-' +
    now.getMonth() +
    '-' +
    now.getDate() +
    '--' +
    now.getTime() +
    '.json';
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gitter-delete-message-bak'));
  const filePath = path.join(dir, filename);
  console.log('Saving log to:', filePath);
  return appendFile(filePath, JSON.stringify(messages, null, 2));
};

const clearMessages = async () => {
  await onMongoConnect();
  console.log('username', opts.username, process.argv);
  const user = await userService.findByUsername(opts.username);
  if (!user) {
    console.error('Could not find user with', opts.username);
    return;
  }

  const response = await chatsForUserSearch.searchChatsForUserId(user.id, {
    limit: opts.limit
  });
  const hits = response && response.hits && response.hits.hits ? response.hits.hits : [];
  console.log('Found ' + hits.length + ' messages');

  let filteredHits = hits;
  if (messageTextFilterRegex) {
    filteredHits = hits.filter(function(hit) {
      return hit._source && hit._source.text && hit._source.text.match(messageTextFilterRegex);
    });
  }

  const messageIds = filteredHits.map(function(hit) {
    return hit._id;
  });

  const possiblyEmptyMessages = await chatService.findByIds(messageIds);

  const messages = possiblyEmptyMessages.filter(Boolean);
  console.log('Working with', messages.length + '/' + messageIds.length);

  await makeBackup(messages);

  if (opts.dry) return;

  return Promise.all(
    messages.map(async message => {
      const troupe = await troupeService.findById(message.toTroupeId);
      return chatService.deleteMessageFromRoom(troupe, message);
    })
  );
};

clearMessages()
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error('Error: ' + err, err);
    shutdown.shutdownGracefully(1);
  });
