'use strict';

var moment = require('moment');
var _ = require('lodash');
var util = require('util');
var BaseRetentionAnalyser = require('./base-cohort-analyser');

function UserRoomsRetentionAnalyser() {
  BaseRetentionAnalyser.apply(this, arguments);
}
util.inherits(UserRoomsRetentionAnalyser, BaseRetentionAnalyser);

UserRoomsRetentionAnalyser.prototype.bucketFor = function(category) {
  if (category === 0) return '0';
  if (category < 10) return '0' + category;
  return '10 or more';
};

UserRoomsRetentionAnalyser.prototype.categoriseUsers = function(allCohortUsers, callback) {
  var self = this;

  var orTerms = _(allCohortUsers)
    .transform(function(result, userIds, timestamp) {
      var start = new Date(parseInt(timestamp, 10));
      var endOfClassificationPeriod = moment(start)
        .add(14, 'days')
        .toDate(); // 2 week classification

      result.push({
        'd.userId': { $in: userIds },
        t: { $gte: start, $lt: endOfClassificationPeriod }
      });
    }, [])
    .value();

  var joinRoomEvents = this.db.collection('gitter_join_room_events');
  joinRoomEvents.aggregate(
    [
      {
        $match: {
          $or: orTerms
        }
      },
      {
        $group: { _id: '$d.userId', total: { $sum: 1 } }
      }
    ],
    function(err, result) {
      if (err) return callback(err);

      var indexed = result.reduce(function(memo, r) {
        memo[r._id] = r.total;
        return memo;
      }, {});

      var categorised = _(allCohortUsers)
        .values()
        .flatten()
        .uniq()
        .transform(function(memo, userId) {
          memo[userId] = self.bucketFor(indexed[userId] || 0);
          return memo;
        }, {})
        .value();

      callback(null, categorised);
    }
  );
};

module.exports = UserRoomsRetentionAnalyser;
