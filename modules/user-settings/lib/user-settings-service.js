'use strict';

var persistence = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var assert = require('assert');
var Promise = require('bluebird');
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

/**
 * For exporting things
 */
exports.getCursorByUserId = function(userId) {
  const cursor = persistence.UserSettings.find({
    userId
  })
    .lean()
    .read(mongoReadPrefs.secondaryPreferred)
    .batchSize(100)
    .cursor();

  return cursor;
};

exports.getUserSettings = function(userId, settingsKey) {
  /* Not sure why mongoose isn't converting these */
  assert(mongoUtils.isLikeObjectId(userId));
  userId = mongoUtils.asObjectID(userId);

  return persistence.UserSettings.findOne({ userId: userId }, 'settings.' + settingsKey, {
    lean: true
  })
    .exec()
    .then(function(us) {
      if (!us) return;
      if (!us.settings) return;

      return us.settings[settingsKey];
    });
};

exports.getMultiUserSettingsForUserId = function(userId, settingsKeys) {
  /* Not sure why mongoose isn't converting these */
  assert(mongoUtils.isLikeObjectId(userId));
  userId = mongoUtils.asObjectID(userId);

  var select = settingsKeys.reduce(
    function(memo, settingsKey) {
      memo['settings.' + settingsKey] = 1;
      return memo;
    },
    {
      _id: 0
    }
  );

  return persistence.UserSettings.findOne({ userId: userId }, select, { lean: true })
    .exec()
    .then(function(us) {
      if (!us) return {};
      if (!us.settings) return {};

      return us.settings;
    });
};

exports.getMultiUserSettings = function(userIds, settingsKey) {
  userIds = userIds
    .map(function(id) {
      /* Not sure why mongoose isn't converting these */
      if (!mongoUtils.isLikeObjectId(id)) return;
      return mongoUtils.asObjectID(id);
    })
    .filter(function(f) {
      return !!f;
    });

  return persistence.UserSettings.find(
    { userId: { $in: userIds } },
    'userId settings.' + settingsKey,
    { lean: true }
  )
    .exec()
    .then(function(settings) {
      var hash = settings.reduce(function(memo, us) {
        memo[us.userId] = us.settings && us.settings[settingsKey];
        return memo;
      }, {});

      return hash;
    });
};

exports.getAllUserSettings = function(userId) {
  /* Not sure why mongoose isn't converting these */
  assert(mongoUtils.isLikeObjectId(userId));
  userId = mongoUtils.asObjectID(userId);

  return persistence.UserSettings.findOne({ userId: userId }, 'settings', { lean: true })
    .exec()
    .then(function(us) {
      if (!us) return;
      return us.settings || {};
    });
};

exports.setUserSettings = function(userId, settingsKey, settings) {
  assert(mongoUtils.isLikeObjectId(userId));
  userId = mongoUtils.asObjectID(userId);

  var setOperation = { $set: {} };
  setOperation.$set['settings.' + settingsKey] = settings;

  return Promise.fromCallback(function(callback) {
    persistence.UserSettings.collection.update(
      { userId: userId },
      setOperation,
      { upsert: true, new: true },
      callback
    );
  });
};

// TODO: remove settings for users removed from troupes, from troupes that have been deleted etc
