'use strict';

var userService = require('gitter-web-users');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var Promise = require('bluebird');
var chatService = require('gitter-web-chats');
var loremIpsum = require('lorem-ipsum');
var dictionary = require('lorem-ipsum/lib/dictionary').words;

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('room', {
    alias: 'r',
    required: true
  })
  .option('users', {
    alias: 'u',
    required: true,
    type: 'array'
  })
  .option('count', {
    alias: 'c',
    default: 1000
  })
  .help('help')
  .alias('help', 'h').argv;

Promise.all([userService.findByUsernames(opts.users), troupeService.findByUri(opts.room)])
  .spread(function(users, room) {
    var a = [];
    for (var i = 0; i < parseInt(opts.count, 10); i++) {
      a.push(i);
    }

    return Promise.map(
      a,
      function(i) {
        var user = users[Math.floor(Math.random() * users.length)];
        return chatService
          .newChatMessageToTroupe(room, user, {
            text: loremIpsum({
              count: Math.round(Math.random() * 5) + 1,
              unit: 'paragraph',
              words: dictionary.concat(
                dictionary,
                dictionary,
                dictionary,
                // '![Cat](http://thecatapi.com/api/images/get?format=src&type=gif&cb=' + Date.now() + ')',
                'http://thecatapi.com/api/images/get?format=src&type=gif&cb=' +
                  (Date.now() + 1 + '&file=.gif'),
                'https://www.youtube.com/watch?v=XLaoiNUhDeQ',
                'https://vine.co/v/eWEXAwIx7Dp',
                'https://vimeo.com/105930659'
              ),
              sentenceLowerBound: 1,
              sentenceUpperBound: 15,
              paragraphLowerBound: 1,
              paragraphUpperBound: 4
            })
          })
          .then(function() {
            if (i % 10 === 0) console.log(i);
          });
      },
      { concurrency: 2 }
    );
  })
  .delay(10000)
  .then(function() {
    process.exit();
  })
  .done();
