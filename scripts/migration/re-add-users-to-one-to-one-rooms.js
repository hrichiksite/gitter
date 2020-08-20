#!/usr/bin/env node
'use strict';

var persistence = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var _ = require('lodash');
var userService = require('gitter-web-users');
var collections = require('gitter-web-utils/lib/collections');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var roomMembershipFlags = require('gitter-web-rooms/lib/room-membership-flags');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

var Promise = require('bluebird');

function getMissingUsers() {
  return persistence.Troupe.aggregate([
    {
      $match: {
        oneToOne: true
      }
    },
    {
      $project: {
        _id: 1,
        userId1: { $arrayElemAt: ['$oneToOneUsers.userId', 0] },
        userId2: { $arrayElemAt: ['$oneToOneUsers.userId', 1] }
      }
    },
    {
      $lookup: {
        from: 'troupeusers',
        localField: '_id',
        foreignField: 'troupeId',
        as: 'users'
      }
    },
    {
      $match: {
        $or: [
          {
            users: { $size: 0 }
          },
          {
            users: { $size: 1 }
          }
        ]
      }
    },
    {
      $project: {
        _id: 1,
        userId1: 1,
        userId2: 1,
        troupeUserId1: { $arrayElemAt: ['$users.userId', 0] }
      }
    }
  ])
    .read(mongoReadPrefs.secondaryPreferred)
    .exec()
    .then(function(results) {
      var missingUsers = [];
      results.forEach(function(doc) {
        if (!doc.troupeUserId1) {
          if (doc.userId1) {
            missingUsers.push({ troupeId: doc._id, userId: doc.userId1 });
          }

          if (doc.userId2) {
            missingUsers.push({ troupeId: doc._id, userId: doc.userId2 });
          }
        } else if (mongoUtils.objectIDsEqual(doc.userId1, doc.troupeUserId1)) {
          if (doc.userId2) {
            missingUsers.push({ troupeId: doc._id, userId: doc.userId2 });
          }
        } else if (mongoUtils.objectIDsEqual(doc.userId2, doc.troupeUserId1)) {
          if (doc.userId1) {
            missingUsers.push({ troupeId: doc._id, userId: doc.userId1 });
          }
        } else {
          throw new Error('Unmatched');
        }
      });

      return missingUsers;
    });
}

function dryRun() {
  return getMissingUsers().then(function(results) {
    var userIds = _.uniq(
      results.map(function(result) {
        return result.userId;
      })
    );

    return userService.findByIds(userIds).then(function(users) {
      var userHash = collections.indexById(users);
      results.forEach(function(result) {
        var user = userHash[result.userId];
        var username = user && user.username;

        console.log({
          troupeId: result.troupeId,
          username: username
        });
      });
    });
  });
}

function execute() {
  return getMissingUsers().then(function(results) {
    return Promise.map(
      results,
      function(result) {
        return roomMembershipService.addRoomMember(
          result.troupeId,
          result.userId,
          roomMembershipFlags.MODES.announcement,
          null
        );
      },
      { concurrency: 1 }
    );
  });
}

require('yargs')
  .command('dry-run', 'Dry run', {}, function() {
    return dryRun()
      .then(function(results) {
        console.log(results);
        process.exit();
      })
      .done();
  })
  .command('execute', 'Execute', {}, function() {
    return execute()
      .then(function(results) {
        console.log(results);
        process.exit();
      })
      .done();
  })
  .demand(1)
  .strict()
  .help('help')
  .alias('help', 'h').argv;
