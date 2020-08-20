#!/usr/bin/env node
'use strict';

var persistence = require('gitter-web-persistence');
var Promise = require('bluebird');
var _ = require('lodash');
var cliff = require('cliff');
var shutdown = require('shutdown');
var uriLookupService = require('gitter-web-uri-resolver/lib/uri-lookup-service');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

function getOrgChannelsWithIncorrectParent() {
  return persistence.Troupe.aggregate([
    {
      $match: {
        githubType: 'ORG_CHANNEL'
      }
    },
    {
      $lookup: {
        from: 'troupes',
        localField: 'parentId',
        foreignField: '_id',
        as: 'parent'
      }
    },
    {
      $unwind: {
        path: '$parent',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        uri: 1,
        lcOwner: '$lcOwner',
        parent: '$parent',
        parentLcUri: '$parent.lcUri',
        uriMatches: { $eq: ['$lcOwner', '$parent.lcUri'] }
      }
    },
    {
      $match: {
        $or: [{ parent: { $exists: false } }, { parent: null }, { uriMatches: false }]
      }
    }
  ])
    .read(mongoReadPrefs.secondaryPreferred)
    .exec();
}

function countRealUsersInRooms(troupeIds) {
  return persistence.TroupeUser.aggregate([
    { $match: { troupeId: { $in: troupeIds } } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: {
        path: '$user'
      }
    },
    {
      $group: {
        _id: '$troupeId',
        count: { $sum: 1 }
      }
    }
  ])
    .read(mongoReadPrefs.secondaryPreferred)
    .exec()
    .then(function(results) {
      return results.reduce(function(memo, result) {
        memo[result._id] = result.count;
        return memo;
      }, {});
    });
}

function keyByField(results, field) {
  return results.reduce(function(memo, result) {
    memo[result[field]] = result;
    return memo;
  }, {});
}

function findOrgRoomsHashed(lcOwners) {
  return persistence.Troupe.find({
    lcUri: { $in: lcOwners },
    githubType: 'ORG'
  })
    .lean()
    .exec()
    .then(function(troupes) {
      return keyByField(troupes, 'lcUri');
    });
}

function getUpdates() {
  return getOrgChannelsWithIncorrectParent()
    .bind({})
    .then(function(results) {
      this.results = results;
      var lcOwners = _.pluck(results, 'lcOwner');
      var troupeIds = _.pluck(results, '_id');

      return [countRealUsersInRooms(troupeIds), findOrgRoomsHashed(lcOwners)];
    })
    .spread(function(userCounts, orgsHashed) {
      return this.results
        .map(function(troupe) {
          var correctParent = orgsHashed[troupe.lcOwner];
          var count = userCounts[troupe._id] || 0;

          var correctLcOwner;
          var correctUri;
          var lastPart = troupe.uri.split('/')[1];
          if (correctParent) {
            correctUri = correctParent.uri + '/' + lastPart;
            correctLcOwner = correctParent.uri.split('/')[0].toLowerCase();
          }

          return {
            _id: troupe._id,
            uri: troupe.uri,
            originalParentId: troupe.parentId,
            originalOwnerUserId: troupe.ownerUserId,
            correctParentId: correctParent && correctParent._id,
            correctParentUri: correctParent && correctParent.uri,
            correctLcOwner: correctLcOwner,
            correctUri: correctUri,
            userCount: count
          };
        })
        .filter(function(update) {
          return update.correctParentId && update.correctUri;
        });
    });
}

function dryRun() {
  return getUpdates().then(function(updates) {
    console.log(
      cliff.stringifyObjectRows(updates, [
        '_id',
        'uri',
        'originalParentId',
        'originalOwnerUserId',
        'correctUri',
        'correctParentId',
        'correctParentUri',
        'correctLcOwner',
        'userCount'
      ])
    );
  });
}

var fixOrgChannel = Promise.method(function(update) {
  var troupeId = update._id;
  var newUri = update.correctUri;
  if (!newUri) return;

  return persistence.Troupe.findById(troupeId).then(function(channel) {
    if (!channel) {
      console.log('Did not find');
      return;
    }

    var newLcUri = newUri.toLowerCase();
    var oldUri = channel.uri;

    var requiresRename = newLcUri !== channel.lcUri;
    if (requiresRename) {
      channel.renamedLcUris.addToSet(channel.lcUri);
    }

    channel.lcUri = newLcUri;
    channel.uri = newUri;
    channel.parentId = update.correctParentId;
    channel.ownerUserId = null;
    channel.lcOwner = update.correctLcOwner;

    return channel.save().then(function() {
      if (!requiresRename) return;

      return uriLookupService.removeBadUri(oldUri.toLowerCase()).then(function() {
        return uriLookupService.reserveUriForTroupeId(troupeId, newLcUri);
      });
    });
  });
});

function execute() {
  console.log('# reticulating splines....');

  return getUpdates().then(function(updates) {
    console.log('# performing ', updates.length, 'updates');
    var count = 0;
    return Promise.map(
      updates,
      function(update) {
        count++;
        if (count % 10 === 0) {
          console.log('# completed ', count);
        }

        return fixOrgChannel(update);
      },
      { concurrency: 10 }
    );
  });
}

require('yargs')
  .command('dry-run', 'Dry run', {}, function() {
    return dryRun()
      .then(function() {
        process.exit();
      })
      .done();
  })
  .command('execute', 'Execute', {}, function() {
    return execute()
      .delay(1000)
      .then(function() {
        shutdown.shutdownGracefully();
      })
      .done();
  })
  .demand(1)
  .strict()
  .help('help')
  .alias('help', 'h').argv;
