#!/usr/bin/env node
'use strict';

var persistence = require('gitter-web-persistence');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var through2Concurrent = require('through2-concurrent');
var ObjectID = require('mongodb').ObjectID;
var _ = require('lodash');
var Promise = require('bluebird');

function membershipStream() {
  return persistence.Troupe.find()
    .lean()
    .stream();
}

function createTroupeUsers(room) {
  if (!room.users || !room.users.length) return Promise.resolve();
  var bulk = persistence.TroupeUser.collection.initializeUnorderedBulkOp();

  room.users.forEach(function(troupeUser) {
    bulk
      .find({ userId: troupeUser.userId, troupeId: room._id })
      .upsert()
      .updateOne({
        $setOnInsert: _.omit(troupeUser, '_id')
      });
  });

  return Promise.fromCallback(function(callback) {
    bulk.execute(callback);
  }).then(function() {
    return persistence.Troupe.update(
      { _id: room._id },
      { $set: { userCount: room.users.length } }
    ).exec();
  });
}

function migrateOneToOneRoom(room) {
  var oneToOneUsers = room.users.map(function(roomUser) {
    return _.extend({}, roomUser, { _id: new ObjectID() });
  });

  return persistence.Troupe.update(
    { _id: room._id },
    { $set: { oneToOneUsers: oneToOneUsers, userCount: oneToOneUsers.length } }
  ).exec();
}

function migrateRoom(room) {
  return createTroupeUsers(room).then(function() {
    if (room.oneToOne && room.users) {
      return migrateOneToOneRoom(room);
    }
  });
}

function performMigration() {
  return new Promise(function(resolve) {
    var count = 0;
    membershipStream()
      .pipe(
        through2Concurrent.obj({ maxConcurrency: 24 }, function(room, enc, callback) {
          var self = this;
          return migrateRoom(room)
            .then(function() {
              self.emit(room.name);
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
