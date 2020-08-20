#!/usr/bin/env node

'use strict';

var userService = require('gitter-web-users');
var autoLurkerService = require('gitter-web-rooms/lib/auto-lurker-service');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var persistence = require('gitter-web-persistence');
var collections = require('gitter-web-utils/lib/collections');
var Promise = require('bluebird');
var shutdown = require('shutdown');
var es = require('event-stream');

var opts = require('yargs')
  .option('room', {
    alias: 'r',
    description: 'Room URI'
  })
  .option('min', {
    alias: 'm',
    default: '31',
    description: 'Minimum time in days since last login'
  })
  .option('members', {
    description: 'Minimum number of members in the room'
  })
  .option('dryRun', {
    type: 'boolean',
    description: 'Just show the users who will be affected'
  })
  .help('help')
  .alias('help', 'h').argv;

var minTimeInDays = parseInt(opts.min, 10);
var members = parseInt(opts.members, 10);

function run() {
  if (opts.room) return handleSingleRoom();
  if (members) return handleMultipleRooms();
  return Promise.reject(new Error('invalid usage'));
}

function handleRoom(troupe) {
  return (opts.dryRun
    ? autoLurkerService.findLurkCandidates(troupe, { minTimeInDays: minTimeInDays })
    : autoLurkerService.autoLurkInactiveUsers(troupe, { minTimeInDays: minTimeInDays })
  )
    .then(function(candidates) {
      var userIds = candidates.map(function(c) {
        return c.userId;
      });
      return [candidates, userService.findByIds(userIds)];
    })
    .spread(function(candidates, users) {
      console.log('>>>>>>>>>>> ROOM ', troupe.uri, '> ', candidates.length, 'candidates');
      var usersHash = collections.indexById(users);

      candidates.forEach(function(c) {
        var user = usersHash[c.userId];
        if (!user) return;

        console.log({
          username: user.username,
          notificationSettings: c.notificationSettings,
          lurk: c.lurk,
          lastAccessTime: c.lastAccessTime && c.lastAccessTime.toISOString()
        });
      });
    });
}

function handleSingleRoom() {
  return troupeService.findByUri(opts.room).then(handleRoom);
}

function handleMultipleRooms() {
  return new Promise(function(resolve, reject) {
    persistence.Troupe.find({ userCount: { $gt: members } })
      .sort({ userCount: -1 })
      .limit(10)
      .stream()
      .pipe(
        es.through(function(room) {
          this.pause();

          var self = this;
          return handleRoom(room)
            .catch(function(err) {
              self.emit('error', err);
            })
            .finally(function() {
              self.resume();
            })
            .done();
        })
      )
      .on('end', function() {
        resolve();
      })
      .on('error', function(err) {
        reject(err);
      });
  });
}

run()
  .delay(1000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error('ERROR IS ', err);
    console.error('ERROR IS ', err.stack);
    shutdown.shutdownGracefully(1);
  });
