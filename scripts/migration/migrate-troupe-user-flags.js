#!/usr/bin/env node
/* eslint complexity: ["error", 18] */
'use strict';

var persistence = require('gitter-web-persistence');
var roomMembershipFlags = require('gitter-web-rooms/lib/room-membership-flags');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var through2Concurrent = require('through2-concurrent');
var BatchStream = require('batch-stream');
var _ = require('lodash');
var Promise = require('bluebird');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var connection = mongoose.connection;

var UserTroupeSettingsSchema = new Schema({
  userId: ObjectId,
  troupeId: ObjectId,
  settings: Schema.Types.Mixed
});
UserTroupeSettingsSchema.index({ userId: 1, troupeId: 1 }, { unique: true });
UserTroupeSettingsSchema.schemaTypeName = 'UserTroupeSettingsSchema';

var UserTroupeSettings = connection.model('UserTroupeSettings', UserTroupeSettingsSchema);

function preloadUserTroupeSettings(userId) {
  console.log('## Preloading usertroupesettings');
  return new Promise(function(resolve, reject) {
    var settings = {};
    var count = 0;
    var query = userId ? { userId: userId } : {};
    return UserTroupeSettings.find(query, {
      userId: 1,
      troupeId: 1,
      'settings.notifications.push': 1,
      _id: 0
    })
      .lean()
      .read(mongoReadPrefs.secondaryPreferred)
      .stream()
      .on('error', reject)
      .on('end', function() {
        resolve(settings);
      })
      .on('data', function(setting) {
        var userId = setting.userId;
        var troupeId = setting.troupeId;
        var value =
          setting.settings && setting.settings.notifications && setting.settings.notifications.push;

        if (userId && troupeId && value) {
          settings[userId + ':' + troupeId] = value;
        }

        count++;
        if (count % 1000 === 0) {
          console.log('## Loaded ', count, 'UserTroupe settings');
        }
      });
  });
}

function getFlagsForSettings(settings, lurk) {
  lurk = !!lurk;
  var flags, flagsWithLurk;
  var warning;
  var defaultValue;
  var category;

  switch (settings || 'none') {
    case 'all':
      flags = roomMembershipFlags.getFlagsForMode('all', false);
      flagsWithLurk = roomMembershipFlags.toggleLegacyLurkMode(flags, lurk);

      if (flagsWithLurk !== flags) {
        warning = lurk ? 'all_with_lurk' : 'unhandled_case_1';
      }
      category = lurk ? 1 : 2;
      defaultValue = false;
      break;

    case 'announcement':
    case 'mention':
      flags = roomMembershipFlags.getFlagsForMode(settings, false);
      flagsWithLurk = roomMembershipFlags.toggleLegacyLurkMode(flags, lurk);

      if (flagsWithLurk !== flags) {
        warning = lurk ? 'mention_without_unread' : 'unhandled_case_2';
      }
      category = lurk ? 3 : 4;

      defaultValue = false;
      break;

    case 'mute':
      flags = roomMembershipFlags.getFlagsForMode(settings, false);
      flagsWithLurk = roomMembershipFlags.toggleLegacyLurkMode(flags, lurk);

      if (flagsWithLurk !== flags) {
        warning = lurk ? 'unhandled_case_3' : 'mute_with_unread';
      }
      category = lurk ? 5 : 6;
      defaultValue = false;
      break;

    case 'none':
      if (lurk) {
        flagsWithLurk = flags = roomMembershipFlags.getFlagsForMode('announcement', false);
        category = 7;
      } else {
        flagsWithLurk = flags = roomMembershipFlags.getFlagsForMode('all', true);
        defaultValue = true;
        category = 8;
      }
      break;

    default:
      if (lurk) {
        flags = roomMembershipFlags.getFlagsForMode('announcement', false);
        warning = 'unknown_with_lurk';
      } else {
        flags = roomMembershipFlags.getFlagsForMode('all', true);
        warning = 'unknown_without_lurk';
      }
      break;
  }

  return {
    lurk: lurk,
    isDefault: defaultValue,
    flags: flagsWithLurk,
    warning: warning,
    category: category
  };
}

function getTroupeUserBatchUpdates(troupeUsers, notificationSettings) {
  var updates = _.map(troupeUsers, function(troupeUser) {
    var lurk = troupeUser.lurk;
    var flags = troupeUser.flags;
    var userId = troupeUser.userId;
    var troupeId = troupeUser.troupeId;
    var notificationSetting = notificationSettings[userId + ':' + troupeId];

    var info = getFlagsForSettings(notificationSetting, lurk);

    return {
      _id: troupeUser._id,
      userId: troupeUser.userId,
      troupeId: troupeUser.troupeId,
      currentFlags: flags,
      newFlags: info.flags,
      lurk: info.lurk,
      warning: info.warning,
      isDefault: info.isDefault,
      category: info.category
    };
  });

  return updates;
}

function getTroupeUsersBatchedStream(userId) {
  var query = userId ? { userId: userId } : {};

  return persistence.TroupeUser.find(query)
    .read(mongoReadPrefs.secondaryPreferred)
    .stream()
    .pipe(new BatchStream({ size: 4096 }));
}

var bulkUpdate = Promise.method(function(updates) {
  if (!updates || !updates.length) return;

  var bulk = persistence.TroupeUser.collection.initializeUnorderedBulkOp();

  updates.forEach(function(update) {
    bulk
      .find({
        _id:
          update._id /*, $or: [{
      flags: { $exists: false }
    }, {
      flags: null
    }, {
      flags: 0
    } ] */
      })
      .updateOne({
        $set: {
          flags: update.newFlags,
          lurk: update.lurk
        }
      });
  });

  return Promise.fromCallback(function(callback) {
    bulk.execute(callback);
  }).then(function(result) {
    console.log(result.toJSON());
  });
});

function migrateTroupeUsers(userId, notificationSettings) {
  return new Promise(function(resolve, reject) {
    getTroupeUsersBatchedStream(userId)
      .pipe(
        through2Concurrent.obj({ maxConcurrency: 10 }, function(troupeUsers, enc, callback) {
          console.log('## Updating batch');

          var updates = getTroupeUserBatchUpdates(troupeUsers, notificationSettings);
          return bulkUpdate(updates).asCallback(callback);
        })
      )
      .on('end', function() {
        resolve();
      })
      .on('error', reject)
      .on('data', function() {});
  });
}

function dryrunTroupeUsers(userId, notificationSettings) {
  var defaultCount = 0;
  var warningCount = 0;
  var warningAggregation = {};
  var categoryAggregation = {};
  var count = 0;

  return new Promise(function(resolve, reject) {
    getTroupeUsersBatchedStream(userId)
      .pipe(
        through2Concurrent.obj({ maxConcurrency: 1 }, function(troupeUsers, enc, callback) {
          count += troupeUsers.length;
          console.log('## Processesing batch', count);

          var updates = getTroupeUserBatchUpdates(troupeUsers, notificationSettings);
          _.forEach(updates, function(f) {
            if (!categoryAggregation[f.category]) {
              categoryAggregation[f.category] = 1;
            } else {
              categoryAggregation[f.category]++;
            }

            if (f.isDefault) {
              defaultCount++;
            }

            var warning = f.warning;
            if (warning) {
              warningCount++;
              if (!warningAggregation[warning]) {
                warningAggregation[warning] = 1;
              } else {
                warningAggregation[warning]++;
              }
            }
          });
          return callback();
          // return displayWarningsForUpdates(warnings)
          //   .asCallback(callback);
        })
      )
      .on('end', function() {
        console.log('TroupeUsers on default settings: ' + defaultCount);
        console.log('TroupeUsers with warnings: ' + warningCount);
        console.log('Warning types: ', JSON.stringify(warningAggregation, null, '  '));
        console.log('Categories: ', JSON.stringify(categoryAggregation, null, '  '));
        resolve();
      })
      .on('error', reject)
      .on('data', function() {});
  });
}

function performMigration(userId) {
  return preloadUserTroupeSettings(userId).then(function(userTroupeSettings) {
    return migrateTroupeUsers(userId, userTroupeSettings);
  });
}

function performDryRun(userId) {
  return preloadUserTroupeSettings(userId).then(function(userTroupeSettings) {
    return dryrunTroupeUsers(userId, userTroupeSettings);
  });
}

var opts = require('nomnom')
  .option('execute', {
    flag: true,
    help: 'Do not perform a dry-run.'
  })
  .option('userId', {
    help: 'Only perform the migration for a single userId.'
  })
  .parse();

function showResult(setting, lurk) {
  var x = getFlagsForSettings(setting, lurk);

  var hash = roomMembershipFlags.flagsToHash(x.flags);
  console.log('setting=', setting, 'lurk=', lurk, 'result=', hash, 'output=', x);
}
showResult('all', true);
showResult('all', false);

showResult('mention', true);
showResult('mention', false);

showResult('mute', true);
showResult('mute', false);

showResult(undefined, true);
showResult(undefined, false);

onMongoConnect()
  .then(function() {
    var userId = mongoUtils.asObjectID(opts.userId);

    if (opts.execute) {
      return performMigration(userId);
    } else {
      return performDryRun(userId);
    }
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
