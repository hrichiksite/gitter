#!/usr/bin/env node

'use strict';

var userService = require('gitter-web-users');
var autoRemovalService = require('gitter-web-rooms/lib/auto-removal-service');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var persistence = require('gitter-web-persistence');
var collections = require('gitter-web-utils/lib/collections');
var Promise = require('bluebird');
var cliff = require('cliff');
var moment = require('moment');
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
  .option('quiet', {
    type: 'boolean',
    description: 'Disables printing of the users removed',
    default: false
  })
  .option('dryRun', {
    type: 'boolean',
    description: 'Just show the users who will be affected',
    default: false
  })
  .help('help')
  .alias('help', 'h').argv;

var minTimeInDays = parseInt(opts.min, 10);
var members = parseInt(opts.members, 10);

function run() {
  // if (!opts.dryRun) {
  //   require('../../server/event-listeners').install();
  // }

  if (opts.room) return handleSingleRoom();
  if (members) return handleMultipleRooms();
  return Promise.reject(new Error('invalid usage'));
}

var total = 0;

function handleRoom(troupe) {
  return (opts.dryRun
    ? autoRemovalService.findRemovalCandidates(troupe.id, { minTimeInDays: minTimeInDays })
    : autoRemovalService.autoRemoveInactiveUsers(troupe.id, troupe.groupId, {
        minTimeInDays: minTimeInDays
      })
  )
    .then(function(candidates) {
      var userIds = candidates.map(function(c) {
        return c.userId;
      });
      return [candidates, userService.findByIds(userIds)];
    })
    .spread(function(candidates, users) {
      total = total + candidates.length;
      if (!candidates.length) return;

      var usersHash = collections.indexById(users);
      candidates.sort(function(a, b) {
        if (!a) {
          if (b) return -1;
          return 0;
        }

        if (!b) return 1;
        return a - b;
      });

      candidates.forEach(function(c) {
        var user = usersHash[c.userId];
        if (!user) return;
        c.username = user.username;
        c.lastAccess = c.lastAccessTime && moment(c.lastAccessTime).format('YYYY/MM/DD HH:mm');
      });

      if (!opts.quiet) {
        console.log(cliff.stringifyObjectRows(candidates, ['userId', 'username', 'lastAccess'])); // eslint-disable-line
      }
    });
}

function handleSingleRoom() {
  return troupeService.findByUri(opts.room).then(troupe => {
    if (!troupe) {
      console.warn(`${opts.room} room passed does not exist! Skipping ${opts.room} room`);
      return Promise.resolve();
    }

    return handleRoom(troupe);
  });
}

function handleMultipleRooms() {
  return new Promise(function(resolve, reject) {
    persistence.Troupe.find({ userCount: { $gt: members } })
      .sort({ userCount: -1 })
      .select('uri userCount groupId')
      .limit(10)
      .stream()
      .pipe(
        es.through(function(room) {
          this.pause();
          console.log('Checking ' + room.uri + ' (' + room.userCount + ' members)');
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
  .then(function() {
    console.log('Completed after removing ' + total + ' users.');
    if (opts.dryRun) process.exit(0);
  })
  .delay(5000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error('ERROR IS ', err);
    console.error('ERROR IS ', err.stack);
    shutdown.shutdownGracefully(1);
  });
