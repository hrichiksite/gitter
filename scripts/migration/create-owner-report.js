#!/usr/bin/env node
'use strict' /* messy messy @lerouxb */;

/* eslint-disable */ var fs = require('fs');
var _ = require('lodash');
var Promise = require('bluebird');
var shutdown = require('shutdown');
var mongoose = require('mongoose');
var persistence = require('gitter-web-persistence');
var installMigrationSchemas = require('./migration-schemas').install;
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var userService = require('gitter-web-users');
var through2Concurrent = require('through2-concurrent');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

var migrationSchemas;

function getBatchedRooms() {
  return persistence.Troupe.aggregate([
    {
      $match: {
        githubType: { $nin: ['ONETOONE'] },
        oneToOne: { $ne: true },
        lcOwner: { $exists: true, $ne: null }
        // NOTE: this skips existing org-owned room renames for now, but it
        // speeds things up a lot when testing remotely
        //groupId: { $exists: false }
      }
    },
    {
      $project: {
        _id: 1,
        lcOwner: 1,
        uri: 1,
        githubType: 1,
        parentId: 1,
        githubId: 1,
        ownerUserId: 1,
        userCount: 1,
        security: 1
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
      $lookup: {
        from: 'githuborgs',
        localField: '_id',
        foreignField: 'lcUri',
        as: 'githuborg'
      }
    }
  ])
    .read(mongoReadPrefs.secondaryPreferred)
    .cursor({ batchSize: 1000 })
    .exec()
    .stream();
}

function findBatchWarnings(opts) {
  var batch = opts.batch;
  var githubTypes = opts.githubTypes;
  var org = opts.org;
  var user = opts.user;
  var oldUser = opts.oldUser;
  var uniqueUserIds = opts.uniqueUserIds;
  var uniqueOwners = opts.uniqueOwners;

  var lcOwner = batch._id;
  var warning;
  var warnings = [];

  // all unique room ids in this batch
  var idMap = {};
  batch.rooms.forEach(function(room) {
    idMap[room._id] = true;
  });

  // gather info
  var missingParentIdMap = {};
  var ownerUserIdMap = {};
  batch.rooms.forEach(function(room) {
    if (room.parentId && !idMap[room.parentId]) {
      missingParentIdMap[room.parentId] = true;
    }
    if (room.ownerUserId) {
      ownerUserIdMap[room.ownerUserId] = true;
    }
  });

  // all non-null, non-undefined parentIds MUST be in this batch
  var missingParentIds = Object.keys(missingParentIdMap);
  if (missingParentIds.length) {
    // this doesn't actually occur in our dataset
    warning = lcOwner + " has parentIds that aren't included in the batch.";
    console.log(warning);
    warnings.push(warning);
  }

  // only one unique, non-null, non-undefined ownerUserId is allowed per batch
  var ownerUserIds = Object.keys(ownerUserIdMap);
  if (ownerUserIds.length > 1) {
    // this is very rare and we'll have to just fix it manually
    warning = lcOwner + ' has more than one ownerUserId.';
    console.log(warning);
    warnings.push(warning);
  }

  // if an lcOwner has both an ORG_CHANNEL or ORG room _and_ a USER_CHANNEL,
  // then that's clearly wrong.
  var githubTypeMap = {};
  batch.rooms.forEach(function(room) {
    githubTypeMap[room.githubType] = true;
  });
  if ((githubTypeMap['ORG_CHANNEL'] || githubTypeMap['ORG']) && githubTypeMap['USER_CHANNEL']) {
    // this is very rare and we'll have to just fix it manually
    warning = lcOwner + ' has both org rooms or channels AND user channels.';
    console.log(warning);
    warnings.push(warning);
  }

  if (user) {
    if (oldUser) {
      // warn if user id doesn't match all the ownerUserIds
      if (
        !_.every(ownerUserIds, function(ownerId) {
          return ownerId == oldUser._id;
        })
      ) {
        warning =
          lcOwner +
          " has ownerUserIds that don't match the owner user's id. (" +
          ownerUserIds +
          ' != ' +
          oldUser._id +
          ')';
        console.log(warning);
        warnings.push(warning);
      }
    }
  } else {
    // warn if the batch has ownerUserIds, but the owner is not a user
    if (ownerUserIds.length) {
      warning = lcOwner + ' has ownerUserIds, but is not a user.';
      console.log(warning);
      warnings.push(warning);
    }
  }

  return warnings;
}

/*
function findGitHubOrg(lcUri) {
  return migrationSchemas.GitHubOrg.findOne({ lcUri: lcUri })
    .read(mongoReadPrefs.secondaryPreferred)
    .lean()
    .exec();
}

function findGitHubUser(lcUri) {
  return migrationSchemas.GitHubUser.findOne({ lcUri: lcUri })
    .read(mongoReadPrefs.secondaryPreferred)
    .lean()
    .exec();
}
*/

function findGithubUserById(githubId) {
  return migrationSchemas.GitHubUser.findOne({ githubId: githubId })
    .read(mongoReadPrefs.secondaryPreferred)
    .lean()
    .exec();
}

var findUsersByOwner = function(lcOwner) {
  var regex = new RegExp(['^', lcOwner, '$'].join(''), 'i');
  return userService.findByUsername(regex).then(function(gitterUser) {
    if (gitterUser) {
      return findGithubUserById(gitterUser.githubId).then(function(githubUser) {
        if (githubUser) {
          return {
            gitterUser: gitterUser,
            githubUser: githubUser
          };
        } else {
          return null;
        }
      });
    } else {
      return null;
    }
  });
};

var findUsersByGitterId = Promise.method(function(ownerUserId) {
  if (ownerUserId) {
    return userService.findById(ownerUserId).then(function(gitterUser) {
      if (gitterUser) {
        return findGithubUserById(gitterUser.githubId).then(function(githubUser) {
          if (githubUser) {
            return {
              gitterUser: gitterUser,
              githubUser: githubUser
            };
          } else {
            return null;
          }
        });
      } else {
        return null;
      }
    });
  } else {
    return null;
  }
});

var numProcessed = 0;

// Try and find things wrong in the database, return a promise.
var findBatchInfo = Promise.method(function(batch) {
  var lcOwner = batch._id;

  var uniqueOwners = _.uniq(
    batch.rooms.map(function(room) {
      return room.uri.split('/')[0];
    })
  );

  var githubTypeMap = {};
  batch.rooms.forEach(function(room) {
    githubTypeMap[room.githubType] = true;
  });
  var githubTypes = Object.keys(githubTypeMap);

  var uniqueUserIds = _.uniq(
    batch.rooms.map(function(room) {
      return room.ownerUserId;
    })
  );

  var type = 'unknown';
  var reason = 'unknown';
  var errors = [];

  var lookups = {};

  return Promise.join(
    (function() {
      // no need to look this up if we're using the matching gh org
      if (batch.githuborg.length) {
        return Promise.resolve(null);
      } else {
        return findUsersByOwner(lcOwner);
      }
    })(),
    (function() {
      // ditto
      if (batch.githuborg.length) {
        return Promise.resolve(null);
      } else {
        return findUsersByGitterId(uniqueUserIds[0]);
      }
    })(),
    function(ownerUsers, roomUsers) {
      var org = batch.githuborg[0]; // could be undefined
      var user = batch.githubuser[0]; // could be undefined
      var githubUser; // user or ownerUser.githubUser or roomUser.githubUser
      var oldUser; // ownerUser.githubUser or roomUser.githubUser

      if (org) {
        // A case-insensitive lookup matched the lcOwner to a current github org.
        type = 'org';
        reason = 'github-org-lookup';

        // if they aren't all this org, update them
        if (
          !_.every(uniqueOwners, function(uniqueUri) {
            return uniqueUri == org.uri;
          })
        ) {
          errors.push({
            errorType: 'owner',
            type: type,
            lcOwner: lcOwner,
            correctOwner: org.uri,
            batch: batch,
            org: org
          });
        }
      } else if (user) {
        githubUser = user;

        // A case-insensitive lookup matched the lcOwner to a current github user.
        type = 'user';
        reason = 'github-username-lookup';

        // if they aren't all this user, update them
        if (
          !_.every(uniqueOwners, function(uniqueUri) {
            return uniqueUri == user.uri;
          })
        ) {
          if (ownerUsers && ownerUsers.gitterUser) {
            // we already have a user with a username matching the lcOwner
            // (case insensitive), but it has clearly been renamed
            // double-check that we actually found the same user, though,
            // otherwise we'll end up renaming the wrong person
            if (ownerUsers.gitterUser.githubId === user.githubId) {
              oldUser = ownerUsers.gitterUser;
            } else {
              console.log(
                "WARNING: owner user and github user doesn't match!",
                ownerUsers.gitterUser.githubId,
                '!=',
                user.githubId
              );
            }
          } else if (roomUsers && roomUsers.gitterUser) {
            // If at least one of the rooms already belonged to a user that
            // still exists we would find it here.
            // HOWEVER, we better double check that the uri actually found the
            // same github user, otherwise we'll rename the wrong person.
            if (roomUsers.gitterUser.githubId === user.githubId) {
              oldUser = roomUsers.gitterUser;
            } else {
              console.log(
                "WARNING: room user and github user doesn't match!",
                roomUsers.gitterUser.githubId,
                '!=',
                user.githubId
              );
            }
          }
          errors.push({
            errorType: 'owner',
            type: type,
            lcOwner: lcOwner,
            correctOwner: user.uri,
            batch: batch,
            // gitter user
            oldUser: oldUser, // could be undefined as in the jashkenas case
            // github user
            user: githubUser
          });
        }
      } else if (ownerUsers) {
        // The lcOwner still matches a username (case-insensitive) on our
        // system and we could still find a github user with that user's
        // githubId. So the user has been renamed in the meantime.

        type = 'user';
        reason = 'gitter-username-lookup';

        githubUser = ownerUsers.githubUser;
        oldUser = ownerUsers.gitterUser;
        errors.push({
          errorType: 'owner',
          type: type,
          lcOwner: lcOwner,
          correctOwner: ownerUsers.githubUser.uri,
          batch: batch,
          oldUser: oldUser,
          user: githubUser
        });
      } else if (roomUsers) {
        // At least one room in this batch was a user channel and we managed to
        // still find that user and then a github user for the same github id.
        // So by now that user has been renamed totally, but at least the
        // github user id is still around.

        // This is a really rare case where the lcOwner isn't even a user on
        // our system anymore. (Need to test to see if it actually happens.)

        type = 'user';
        reason = 'owneruserid-lookup';

        githubUser = roomUsers.githubUser;
        oldUser = roomUsers.gitterUser;
        errors.push({
          errorType: 'owner',
          type: type,
          lcOwner: lcOwner,
          correctOwner: roomUsers.githubUser.uri,
          batch: batch,
          oldUser: oldUser,
          user: githubUser
        });
      } else {
        // any other ideas? Try and check github using a room id and see if we
        // get anything back? Most remaining differences are probably caused by
        // renamed orgs as we can't detect anything more than a simple case
        // change.
      }

      if (githubUser) {
        // does this user exist in our system?
        // (this is primarily for checking the jashkenas case, not the same as oldUser)
        if (oldUser && oldUser.githubId == githubUser.githubId) {
          // little optimisation..
          lookups.gitterUser = Promise.resolve(oldUser);
        } else {
          lookups.gitterUser = userService.findByGithubId(githubUser.githubId);
        }
      }

      return Promise.props(lookups).then(function(results) {
        console.log(++numProcessed, lcOwner, type, reason);

        errors.forEach(function(error) {
          // in case there was a matching github user above, but no
          // ownerUsers and no roomUsers, so we didn't already have the old
          // gitterUser set.
          error.oldUser = oldUser || results.gitterUser;
        });

        return errorsToUpdates(errors).then(function(updates) {
          /*
              if (updates.length) {
                console.log(updates);
              }
              */
          var data = {
            type: type,
            reason: reason,
            updates: updates,
            org: org,
            user: githubUser,
            githubTypeMap: githubTypeMap,
            warnings: findBatchWarnings({
              batch: batch,
              githubTypes: githubTypes,
              githubTypeMap: githubTypeMap,
              uniqueUserIds: uniqueUserIds,
              uniqueOwners: uniqueOwners,
              org: org,
              user: githubUser,
              oldUser: oldUser || results.gitterUser
            })
          };

          if (lookups.gitterUser) {
            data.hasGitterUser = !!results.gitterUser;
          }

          return data;
        });
      });
    }
  );
});

// promise wrapping a stream that will return the things that are wrong that we
// can try and fix automatically
function getInfo() {
  return new Promise(function(resolve, reject) {
    var numBatches = 0;
    var numOrgs = 0;
    var numUsers = 0;
    var numUnknown = 0;
    var numOrgUpdates = 0;
    var numUserUpdates = 0;
    var numUserRenames = 0;
    var numWarnings = 0;
    var numOrgMultiple = 0;
    var numUserMultiple = 0;
    var numMissingUsers = 0;
    var updates = [];
    var warnings = [];
    var unknown = [];

    getBatchedRooms()
      .pipe(
        through2Concurrent.obj({ concurrency: 25 }, function(batch, enc, callback) {
          numBatches++;
          findBatchInfo(batch).then(function(info) {
            if (info.type == 'org') {
              numOrgs++;
              if (batch.rooms.length > 1) {
                numOrgMultiple++;
              }
            }
            if (info.type == 'user') {
              numUsers++;
              if (batch.rooms.length > 1) {
                numUserMultiple++;
              }
              if (!info.hasGitterUser) {
                numMissingUsers++;
              }
            }
            if (info.type == 'unknown') {
              numUnknown++;
              unknown.push(batch);

              var hasOrgRoom = !!(info.githubTypeMap['ORG'] || info.githubTypeMap['ORG_CHANNEL']);
              var hasUserRoom = !!info.githubTypeMap['USER_CHANNEL'];
              var probably;
              if (hasOrgRoom) {
                probably = 'org';
              }
              if (hasUserRoom) {
                probably = 'user';
              }
              batch.rooms.forEach(function(room) {
                room.probably = probably;
              });
            }

            if (info.updates.length) {
              if (info.type == 'org') {
                numOrgUpdates += info.updates.length;
              }
              if (info.type == 'user') {
                numUserUpdates += info.updates.length;

                info.updates.forEach(function(update) {
                  if (update.oldUsername && update.newUsername) {
                    if (update.oldUsername !== update.newUsername) {
                      // a rename is one where more than just the case changed
                      // NOTE: it is possible that we could end up with
                      // duplicate user renames because the room batches had
                      // separate uri prefixes, but got renamed to the same
                      // user because they belonged to the same one. Happens if
                      // the user created some rooms before the rename and some
                      // afterwards.
                      numUserRenames++;
                    }
                  }
                });
              }
              Array.prototype.push.apply(updates, info.updates);
            }

            if (info.warnings.length) {
              numWarnings += info.warnings.length;
              Array.prototype.push.apply(warnings, info.warnings);
            }
            callback();
          });
        })
      )
      .on('data', function(batch) {})
      .on('end', function() {
        // because things are happening that are making me paranoid
        console.log('------------------------------------------');
        console.log(numBatches + ' batches processed');
        console.log(numOrgs + ' orgs');
        console.log(numUsers + ' users');
        console.log(numUnknown + ' unknown');
        console.log(numOrgUpdates + ' org updates');
        console.log(numUserUpdates + ' user updates');
        console.log(numUserRenames + ' user renames');
        console.log(numWarnings + ' warnings');
        console.log(numOrgMultiple + ' orgs with multiple rooms.');
        console.log(numUserMultiple + ' users with multiple rooms.');
        console.log(numMissingUsers + " users haven't signed up with us.");
        console.log('NOTE: rooms could still be wrong in other parts or aspects');
        resolve({
          numBatches: numBatches,
          numOrgs: numOrgs,
          numUsers: numUsers,
          numUnknown: numUnknown,
          numOrgUpdates: numOrgUpdates,
          numUserUpdates: numUserUpdates,
          numUserRenames: numUserRenames,
          numWarnings: numWarnings,
          numOrgMultiple: numOrgMultiple,
          numUserMultiple: numUserMultiple,
          numMissingUsers: numMissingUsers,
          updates: updates,
          warnings: warnings,
          unknown: unknown
        });
      })
      .on('error', function(error) {
        reject(error);
      });
  });
}

var findUpdatesForOwnerError = Promise.method(function(error) {
  // check all the room uris and all the rooms with incorrect uris have to
  // be updated. also add a redirect.
  var updates = [];

  // either or both of these could be null
  var gitterUser = error.oldUser;
  var githubUser = error.user;

  if (error.type == 'user' && error.oldUser) {
    // double check again
    if (error.oldUser.githubId == error.user.githubId) {
      // rename the user too
      var userUpdate = {
        type: 'rename-user',
        gitterUserId: gitterUser._id,
        githubUserId: githubUser.githubId,
        oldUsername: gitterUser.username,
        newUsername: githubUser.uri
      };
      //console.log(JSON.stringify(userUpdate));
      updates.push(userUpdate);
    }
  }

  error.batch.rooms.forEach(function(room) {
    // 1, 2 or 3 parts
    var parts = room.uri.split('/');
    parts[0] = error.correctOwner; // error.org.uri or error.user.uri
    var correctUri = parts.join('/');

    if (room.uri == correctUri) {
      // this one is correct
      return;
    }

    var roomUpdate = {
      type: 'rename-room',
      roomId: room._id,
      groupType: error.type,
      // only filled in for renames
      gitterUserId: gitterUser && gitterUser._id,
      // only filled in for type user or renames
      githubUserId: githubUser && githubUser.githubId,
      oldUri: room.uri,
      newUri: correctUri,
      newLcUri: correctUri.toLowerCase()
    };
    //console.log(JSON.stringify(roomUpdate));
    updates.push(roomUpdate);
  });

  return updates;
});

// asynchronously figure out how to fix the errors and return a promise with
// updates
function errorsToUpdates(errors) {
  return Promise.map(errors, function(error) {
    // return an array of objects representing updates. could be empty.
    if (error.errorType == 'owner') {
      return findUpdatesForOwnerError(error);
    } else {
      return Promise.resolve([]);
    }
  }).then(function(arrays) {
    // each error could expand into 0, 1 or n updates, so join then all into
    // one array
    return [].concat.apply([], arrays);
  });
}

function die(error) {
  console.error(error);
  console.error(error.stack);
  process.exit(1);
}

var opts = require('yargs')
  .option('output', {
    required: true,
    description: 'where to write the json report'
  })
  .help('help')
  .alias('help', 'h').argv;

onMongoConnect().then(function() {
  migrationSchemas = installMigrationSchemas(mongoose.connection);
  return getInfo()
    .then(function(report) {
      fs.writeFileSync(opts.output, JSON.stringify(report));
      shutdown.shutdownGracefully();
    })
    .catch(die);
});
