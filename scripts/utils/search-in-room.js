#!/usr/bin/env node

'use strict';

var shutdown = require('shutdown');
var persistence = require('gitter-web-persistence');
var chatService = require('gitter-web-chats');

var opts = require('yargs')
  .option('uri', {
    alias: 'u',
    required: true,
    description: 'Room URI'
  })
  .option('q', {
    required: true,
    description: 'Query'
  })
  .help('help')
  .alias('help', 'h').argv;

function findRoom(uri) {
  return persistence.Troupe.findOne({ lcUri: uri.toLowerCase() }).exec();
}

function execute(opts) {
  return findRoom(opts.uri)
    .then(function(room) {
      var options = {
        lang: 'en'
      };

      return chatService.searchChatMessagesForRoom(room._id, opts.q, options);
    })
    .then(function(results) {
      console.log(results);
    });
}

execute(opts)
  .delay(1000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .done();
