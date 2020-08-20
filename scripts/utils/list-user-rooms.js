#!/usr/bin/env node
'use strict';

var _ = require('lodash');
var yargs = require('yargs');
var shutdown = require('shutdown');
var cliff = require('cliff');
var persistence = require('gitter-web-persistence');
var TroupeUser = persistence.TroupeUser;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var userService = require('gitter-web-users');
var shimPositionOption = require('../yargs-shim-position-option');

var opts = yargs
  .option(
    'username',
    shimPositionOption({
      position: 0,
      required: true,
      description: 'username to look up e.g trevorah',
      string: true
    })
  )
  .help('help')
  .alias('help', 'h').argv;

function findRoomsForUser(userId) {
  userId = mongoUtils.asObjectID(userId);
  return TroupeUser.aggregate([
    { $match: { userId: userId } },
    { $project: { troupeId: 1 } },
    {
      /* Join the troupes onto TroupeUser */
      $lookup: {
        from: 'troupes',
        localField: 'troupeId',
        foreignField: '_id',
        as: 'troupe'
      }
    },
    {
      $unwind: '$troupe'
    },
    {
      $project: {
        _id: '$troupe._id',
        uri: '$troupe.uri',
        groupId: '$troupe.groupId',
        lcOwner: '$troupe.lcOwner',
        oneToOne: '$troupe.oneToOne'
      }
    }
  ])
    .read('primaryPreferred')
    .exec()
    .then(function(results) {
      return results;
    });
}

function run() {
  return userService
    .findByUsername(opts.username)
    .then(function(user) {
      return findRoomsForUser(user._id);
    })
    .then(function(results) {
      var sorted = _.sortBy(results, 'uri');
      console.log(
        cliff.stringifyObjectRows(sorted, ['_id', 'uri', 'groupId', 'lcOwner', 'oneToOne'])
      );
    });
}

run()
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    process.exit(1);
    shutdown.shutdownGracefully(1);
  });
