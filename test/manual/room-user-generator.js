#!/usr/bin/env node
'use strict';

var troupeService = require('gitter-web-rooms/lib/troupe-service');
var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var roomMembershipFlags = require('gitter-web-rooms/lib/room-membership-flags');
var cumberbatch = require('cumberbatch-name');

var opts = require('yargs')
  .option('room', {
    alias: 'r',
    required: true
  })
  .option('user', {
    alias: 'u',
    required: true
  })
  .option('count', {
    alias: 'c',
    default: 1000
  })
  .help('help')
  .alias('help', 'h').argv;

return troupeService
  .findByUri(opts.room)
  .then(function(room) {
    var a = [];
    for (var i = 0; i < parseInt(opts.count, 10); i++) {
      var displayName = cumberbatch();
      var username = displayName.replace(/[^A-Za-z]/g, '').toLowerCase() + (i + 1);
      a.push({ username: username, displayName: displayName });
    }

    return Promise.map(
      a,
      function(userInfo, i) {
        var newUser = new persistence.User({
          username: userInfo.username,
          displayName: userInfo.displayName,
          state: 'INVITED'
        });

        return newUser
          .save()
          .then(function() {
            if (++i % 10 === 0) console.log(i);
            return newUser._id;
          })
          .then(function(userId) {
            var flags = roomMembershipFlags.getFlagsForMode('all', true);
            return roomMembershipService.addRoomMember(room._id, userId, flags);
          });
      },
      { concurrency: 2 }
    );
  })
  .delay(1000)
  .then(function() {
    process.exit();
  })
  .done();
