#!/usr/bin/env node
'use strict';

var persistence = require('gitter-web-persistence');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var userService = require('gitter-web-users');
var through2Concurrent = require('through2-concurrent');
var Promise = require('bluebird');
var GitHubRepoService = require('gitter-web-github').GitHubRepoService;

function orgStream() {
  return persistence.Troupe.find(
    {
      githubType: 'REPO',
      $or: [{ githubId: null }, { githubId: { $exists: false } }]
    },
    {
      uri: 1,
      security: 1
    }
  )
    .lean()
    .stream();
}

function updateOrgRoom(room) {
  if (room.uri.indexOf('_test_') === 0) return Promise.resolve();

  return Promise.try(function() {
    if (room.security === 'PUBLIC') {
      return null;
    }

    return roomMembershipService.findMembersForRoom(room._id, { limit: 1 }).then(function(userIds) {
      if (userIds.length === 0) return null;

      return userService.findById(userIds[0]);
    });
  })
    .then(function(userId) {
      var repoService = new GitHubRepoService(userId);
      return repoService.getRepo(room.uri);
    })
    .then(function(repo) {
      if (!repo) return;
      console.log('UPDATE ' + room.uri, 'GITHUB ID ', repo.id);
      // return persistence.Troupe.update({ _id: room._id, $or: [{ githubId: null}, { githubId: { $exists: false } }] }, { githubId: org.id }).exec();
    });
}

function performMigration() {
  return new Promise(function(resolve) {
    var count = 0;
    orgStream()
      .pipe(
        through2Concurrent.obj({ maxConcurrency: 6 }, function(room, enc, callback) {
          var self = this;
          return updateOrgRoom(room)
            .then(function() {
              self.emit(room.uri);
            })
            .catch(function(err) {
              console.log(err);
            })
            .nodeify(callback);
        })
      )
      .on('data', function() {
        count++;
        if (count % 100 === 0) {
          console.log('Completed ', count);
        }
      })
      .on('end', function() {
        console.log('DONE');
        resolve();
      });
  });
}

onMongoConnect()
  .then(function() {
    return performMigration();
  })
  .delay(1000)
  .then(function() {
    process.exit();
  })
  .catch(function(err) {
    console.error(err.stack);
    process.exit(1);
  })
  .done();
