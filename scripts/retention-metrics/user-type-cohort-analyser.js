'use strict';

var _ = require('lodash');
var util = require('util');
var BaseRetentionAnalyser = require('./base-cohort-analyser');
var Troupe = require('gitter-web-persistence').Troupe;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var collections = require('gitter-web-utils/lib/collections');

function UserRoomsRetentionAnalyser() {
  BaseRetentionAnalyser.apply(this, arguments);
}
util.inherits(UserRoomsRetentionAnalyser, BaseRetentionAnalyser);

UserRoomsRetentionAnalyser.prototype.categoriseUsers = function(allCohortUsers, callback) {
  var self = this;

  var userIds = _(allCohortUsers)
    .values()
    .flatten()
    .map(mongoUtils.asObjectID)
    .value();

  Troupe.aggregate(
    [
      { $match: { 'users.userId': { $in: userIds } } },
      { $project: { githubType: 1, security: 1, users: 1, _id: 0 } },
      { $unwind: '$users' },
      { $project: { githubType: 1, security: 1, userId: '$users.userId' } },
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: '$userId',
          roomTypes: { $push: { githubType: '$githubType', security: '$security' } }
        }
      }
    ],
    function(err, result) {
      if (err) return callback(err);

      var indexed = result.reduce(function(memo, r) {
        memo[r._id] = r.roomTypes;
        return memo;
      }, {});

      var categorised = _(userIds)
        .transform(function(memo, userId) {
          memo[userId] = self.bucketFor(indexed[userId] || []);
          return memo;
        }, {})
        .value();

      var noneUserIds = _(categorised)
        .keys()
        .filter(function(userId) {
          return categorised[userId] === 'none';
        })
        .value();

      if (!noneUserIds.length) return callback(null, categorised);

      var minKey = _(allCohortUsers)
        .keys()
        .min();
      var minDate = new Date(minKey);

      // Try and do some further analysis of users in no rooms
      self.supplementInfoForNoRoomUsers(minDate, noneUserIds, function(
        err,
        supplementaryUserCategories
      ) {
        if (err) return callback(err);

        Object.keys(supplementaryUserCategories).forEach(function(userId) {
          var category = supplementaryUserCategories[userId];

          categorised[userId] = 'left-' + category;
        });

        return callback(null, categorised);
      });
    }
  );
};

UserRoomsRetentionAnalyser.prototype.supplementInfoForNoRoomUsers = function(
  minDate,
  userIds,
  callback
) {
  var self = this;
  var joinRoomEvents = this.db.collection('gitter_join_room_events');

  joinRoomEvents
    .find(
      { 'd.userId': { $in: userIds }, t: { $gte: minDate } },
      { _id: 0, 'd.userId': 1, 'd.room_uri': 1 }
    )
    .toArray(function(err, roomJoins) {
      if (err) return callback(err);

      var troupeLcUris = _(roomJoins)
        .map(function(f) {
          return f.d.room_uri;
        })
        .uniq()
        .map(function(s) {
          return s.toLowerCase();
        })
        .value();

      Troupe.find(
        { lcUri: { $in: troupeLcUris } },
        { _id: 0, lcUri: 1, githubType: 1, security: 1 },
        function(err, troupes) {
          if (err) return callback(err);

          var troupesIndexed = collections.indexByProperty(troupes, 'lcUri');

          var result = _(roomJoins)
            .transform(function(result, roomJoinEvent) {
              var roomUri = roomJoinEvent.d.room_uri;

              var userId = roomJoinEvent.d.userId;
              if (!userId) return;

              var troupe;
              if (!roomUri) {
                troupe = {}; // Will return a result of MIXED
              } else {
                troupe = troupesIndexed[roomUri.toLowerCase()] || {};
              }

              if (result[userId]) {
                result[userId].push(troupe);
              } else {
                result[userId] = [troupe];
              }
            }, {})
            .transform(function(result, rooms, userId) {
              result[userId] = self.bucketFor(rooms);
            })
            .value();

          return callback(null, result);
        }
      );
    });
};

UserRoomsRetentionAnalyser.prototype.bucketFor = function(roomsList) {
  if (roomsList.length === 0) return 'none';

  var roomPrivacy = roomsList.map(function(roomType) {
    if (roomType.githubType === 'ORG') return 'private';
    if (roomType.githubType === 'ONETOONE') return 'onetoone';

    if (roomType.security === 'PRIVATE') return 'private';
    if (roomType.security === 'PUBLIC') return 'public';
    if (roomType.security === 'INHERITED') return 'private'; // Not strictly true, but good enough for now

    return 'unknown';
  });

  if (
    roomPrivacy.every(function(f) {
      return f === 'private';
    })
  )
    return 'private';
  if (
    roomPrivacy.every(function(f) {
      return f === 'public';
    })
  )
    return 'public';
  if (
    roomPrivacy.every(function(f) {
      return f === 'private' || f === 'onetoone';
    })
  )
    return 'private-onetoone';
  if (
    roomPrivacy.every(function(f) {
      return f === 'public' || f === 'onetoone';
    })
  )
    return 'public-onetoone';

  return 'mixed';
};

module.exports = UserRoomsRetentionAnalyser;
