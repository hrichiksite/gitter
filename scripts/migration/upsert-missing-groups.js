#!/usr/bin/env node
'use strict';

var shutdown = require('shutdown');
var persistence = require('gitter-web-persistence');
var through2 = require('through2');
var Promise = require('bluebird');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var userService = require('gitter-web-users');
var securityDescriptorGenerator = require('gitter-web-permissions/lib/security-descriptor-generator');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

function getGroupableRooms(matchMissingOnly) {
  var match = {
    githubType: { $nin: ['ONETOONE'] },
    oneToOne: { $ne: true },
    lcOwner: { $exists: true, $ne: null }
  };
  if (matchMissingOnly) {
    match.groupId = { $exists: false };
  }

  return (
    persistence.Troupe.aggregate([
      {
        $match: match
      },
      {
        $project: {
          uri: 1,
          lcOwner: 1,
          githubType: 1,
          parentId: 1,
          ownerUserId: 1
        }
      },
      {
        $group: {
          _id: '$lcOwner',
          rooms: { $push: '$$CURRENT' }
        }
      },
      {
        $lookup: {
          from: 'githubusers',
          localField: '_id',
          foreignField: 'lcUri',
          as: 'githubuser'
        }
      },
      {
        $unwind: {
          path: '$githubuser',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'githuborgs',
          localField: '_id',
          foreignField: 'lcUri',
          as: 'githuborg'
        }
      },
      {
        $unwind: {
          path: '$githuborg',
          preserveNullAndEmptyArrays: true
        }
      }
    ])
      .read(mongoReadPrefs.secondaryPreferred)
      .cursor({ batchSize: 1000 })
      // Why exec() before stream() unlike every other instance of .stream() in
      // the app? Aggregate returns different cursors/reponses to find and the
      // rest.
      .exec()
      .stream()
  );
}

var gatherBatchInfo = Promise.method(function(batch) {
  var type;
  var owner;
  if (batch.githuborg) {
    type = 'org';
    owner = batch.githuborg;
  } else if (batch.githubuser) {
    type = 'user';
    owner = batch.githubuser;
  } else {
    // TODO: after figuring out what to do about the rest, we'll do something
    // about this. But this number will also go down if we rename some things
    // using fix-room-owners which is probably the better way to go about it.
    type = 'unknown';
  }

  var info = {
    type: type,
    owner: owner
  };

  if (type === 'user' && batch.githubuser) {
    // tried to do this with mongo lookups, but it gave me some kind of
    // cartesian product type effect
    return userService.findByGithubId(batch.githubuser.githubId).then(function(gitterUser) {
      // mimick only the correct ones according to the owner report and what
      // would happen after we ran the renames. So exact (case-sensitive)
      // match on username with an existing github user only.
      if (gitterUser && gitterUser.username === batch.githubuser.uri) {
        batch.gitterUser = gitterUser;
      }
      return info;
    });
  } else {
    return info;
  }
});

function log(batch, enc, callback) {
  var lcOwner = batch._id;
  gatherBatchInfo(batch).then(function(info) {
    console.log(
      lcOwner,
      batch.gitterUser && batch.gitterUser.username, // could be undefined
      info.type,
      info.owner && info.owner.uri, // could be undefined if type == unknown
      batch.rooms.length
    );

    callback();
  });
}

function migrate(batch, enc, callback) {
  var lcOwner = batch._id;
  gatherBatchInfo(batch).then(function(info) {
    console.log(
      lcOwner,
      info.type,
      info.owner && info.owner.uri, // could be undefined if type == unknown
      batch.rooms.length
    );

    if (info.type === 'unknown') {
      return callback();
    }

    // If we found a gitter user for the corresponding github user for
    // this user batch, then we use that. For orgs or the jashkenas user
    // case that will just be null.
    // QUESTION: In the jashkenas case, should the security descriptor
    // still be user or should it be org or something else?
    var gitterUser = info.type === 'user' ? batch.gitterUser : null;

    // Insert group security descriptors for the owning org or user.
    // (this will only insert if it is missing)
    var githubType = info.type.toUpperCase();
    var securityDescriptor = securityDescriptorGenerator.generate(gitterUser, {
      type: 'GH_' + githubType, // ORG or USER
      linkPath: info.owner.uri, // mixed case OK?
      externalId: info.owner.githubId,
      security: 'PUBLIC'
    });

    // upsert the lcOwner into group
    var query = { lcUri: lcOwner };
    return mongooseUtils
      .upsert(persistence.Group, query, {
        // only set on insert because we don't want to override name
        // or anything like that
        $setOnInsert: {
          name: info.owner.uri,
          uri: info.owner.uri,
          lcUri: info.owner.lcUri,
          sd: securityDescriptor
        }
      })
      .spread(function(group /*, existing */) {
        var groupId = group._id;
        var promises = [];

        // whether or not a new one was inserted we have to fill in the missing
        // groupId for the batch anyway
        promises.push(
          persistence.Troupe.update(
            {
              lcOwner: lcOwner,
              // strip out things that shouldn't have a group just in case
              githubType: {
                $nin: ['ONETOONE']
              },
              // only the missing ones
              groupId: { $exists: false }
            },
            {
              $set: { groupId: groupId }
            },
            {
              multi: true
            }
          ).exec()
        );

        // All existing groups (org OR user) get the old style community uris.
        // (this upserts, so safe to run again)
        // DISABLE for now
        //promises.push(uriLookupService.reserveUriForGroupId(groupId, 'org/'+group.lcUri+'/rooms'));

        return Promise.all(promises);
      })
      .then(function() {
        callback();
      })
      .catch(function(err) {
        console.error(err);
        console.error(err.stack);
        callback(err);
      });
  });
}

function run(f, missingOnly, callback) {
  getGroupableRooms(missingOnly)
    .pipe(through2.obj(f))
    .on('data', function() {})
    .on('end', function() {
      console.log('done!');
      callback();
    })
    .on('error', function(error) {
      callback(error);
    });
}

function done(error) {
  console.log('Done. Waiting a bit...');
  setTimeout(function() {
    if (error) {
      console.error(error);
      console.error(error.stack);
      process.exit(1);
    } else {
      shutdown.shutdownGracefully();
    }
  }, 10000);
}

onMongoConnect().then(function() {
  require('yargs')
    .boolean('missing')
    .describe('missing', 'Only handle rooms missing groups.')
    .command('dry-run', 'Dry run', {}, function(opts) {
      run(log, opts.missing, done);
    })
    .command('execute', 'Execute', {}, function(opts) {
      run(migrate, opts.missing, function(err) {
        done(err);
      });
    })
    .demand(1)
    .strict()
    .help('help')
    .alias('help', 'h').argv;
});
