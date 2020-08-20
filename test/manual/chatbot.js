#!/usr/bin/env node

/*jslint node: true, unused:true */
'use strict';

var userService = require('gitter-web-users');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var chatService = require('gitter-web-chats');
var shutdown = require('shutdown');

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('user', {
    alias: 'u',
    required: true
  })
  .option('troupe', {
    alias: 't',
    required: true
  })
  .option('frequency', {
    alias: 'f',
    default: '10'
  }).argv;

var count = 0;

function sendMessage(troupe, user) {
  console.log('Sending message: ', ++count);
  return chatService.newChatMessageToTroupe(troupe, user, {
    text: 'The time is ' + new Date()
  });
}

var finished = false;

function chatbot() {
  return userService.findByUsername(opts.user).then(function(user) {
    if (!user) throw new Error('User not found');

    return troupeService.findByUri(opts.troupe).then(function(troupe) {
      if (!troupe) throw new Error('Troupe not found');

      var freq = parseFloat(opts.frequency, 10) * 1000;

      console.log('Hit any key to stop');

      function next() {
        if (finished) {
          return;
        }

        return sendMessage(troupe, user)
          .delay(freq)
          .then(next);
      }

      return next();
    });
  });
}

process.stdin.on('data', function() {
  console.log('Okay, shutting down');
  finished = true;
});

chatbot()
  .delay(5000)
  .then(function() {
    shutdown.shutdownGracefully();
  });
