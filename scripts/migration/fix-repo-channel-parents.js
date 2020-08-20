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
        githubType: 'REPO_CHANNEL'
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
      $match: {
        $or: [{ parent: { $exists: false } }, { parent: null }]
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

function findRepoRoomsHashed(ownerLcUris) {
  return persistence.Troupe.find({
    lcUri: { $in: ownerLcUris },
    githubType: 'REPO'
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
      var troupeIds = _.pluck(results, '_id');
      var ownerLcUris = _.map(results, function(troupe) {
        return troupe.lcUri
          .split('/')
          .splice(0, 2)
          .join('/');
      });
      return [countRealUsersInRooms(troupeIds), findRepoRoomsHashed(ownerLcUris)];
    })
    .spread(function(userCounts, reposHashed) {
      return this.results
        .map(function(troupe) {
          var realOwnerLcUri = troupe.lcUri
            .split('/')
            .splice(0, 2)
            .join('/');
          var correctParent = reposHashed[realOwnerLcUri];
          var correctLcOwner;
          var correctUri;
          var lastPart = troupe.uri.split('/')[2];
          if (correctParent) {
            correctUri = correctParent.uri + '/' + lastPart;
            correctLcOwner = correctParent.uri.split('/')[0].toLowerCase();
          }
          var count = userCounts[troupe._id] || 0;
          return {
            _id: troupe._id,
            originalUri: troupe.uri,
            originalParentId: troupe.parentId,
            originalLcOwner: troupe.lcOwner,
            originalOwnerUserId: troupe.ownerUserId,
            correctUri: correctUri,
            correctParentId: correctParent && correctParent._id,
            correctLcOwner: correctLcOwner,
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
        'originalUri',
        'originalParentId',
        'originalOwnerUserId',
        'originalLcOwner',
        'correctUri',
        'correctParentId',
        'correctLcOwner',
        'userCount'
      ])
    );
  });
}

var fixRepoChannel = Promise.method(function(update) {
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

        return fixRepoChannel(update);
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
