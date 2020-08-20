'use strict';

var moment = require('moment');
var _ = require('lodash');
var assert = require('assert');
var cohortUtils = require('./cohort-utils');

function BaseRetentionAnalyser(db, options) {
  this.db = db;
  this.options = options || {};
  this.debug = options.debug || function() {};
}

BaseRetentionAnalyser.prototype.getLoginDataPerDay = function(allCohortUsers, callback) {
  var self = this;
  var userLoginEvents = this.db.collection('gitter_user_login_events');

  var orTerms = _(allCohortUsers)
    .transform(function(result, userIds, timestamp) {
      var ts = parseInt(timestamp, 10);
      var start = new Date(ts);
      var term = {
        'd.userId': { $in: userIds },
        t: { $gte: start }
      };

      var limit = self.options.limit;
      if (limit) {
        var limitOfUsage = moment(start)
          .add(limit.amount, limit.unit)
          .toDate();

        term.t.$lt = limitOfUsage;
      }

      result.push(term);
    }, [])
    .value();

  userLoginEvents.aggregate(
    [
      {
        $match: {
          $or: orTerms
        }
      },
      {
        $project: {
          userId: '$d.userId',
          period: { year: { $year: '$t' }, dayOfYear: { $dayOfYear: '$t' } }
        }
      },
      {
        $group: {
          _id: '$period',
          userIds: { $addToSet: '$userId' }
        }
      }
    ],
    function(err, periodData) {
      if (err) return callback(err);

      assert(periodData.length > 0, 'No activity found');

      periodData.sort(function(a, b) {
        var dA = cohortUtils.makeDate(a._id.year, a._id.dayOfYear).valueOf();
        var dB = cohortUtils.makeDate(b._id.year, b._id.dayOfYear).valueOf();
        if (dA < dB) return -1;
        if (dA > dB) return +1;
        return +0;
      });

      var r = periodData.reduce(function(memo, f) {
        var ts = cohortUtils.makeDate(f._id.year, f._id.dayOfYear).valueOf();
        memo[ts] = f.userIds;
        return memo;
      }, {});

      callback(null, r);
    }
  );
};

BaseRetentionAnalyser.prototype.rollupUsageIntoWeeks = function(input) {
  var uniqueUserCountBefore = _(input)
    .values()
    .uniq()
    .size();

  var weekly = _(input)
    .transform(function(result, userIds, timestamp) {
      var cohortDate = cohortUtils.getStartOfWeek(moment(parseInt(timestamp, 10)));

      timestamp = cohortDate.valueOf();

      if (result[timestamp]) {
        result[timestamp] = result[timestamp].concat(userIds);
      } else {
        result[timestamp] = userIds;
      }
    })
    .transform(function(result, userIds, timestamp) {
      result[timestamp] = _.uniq(userIds);
    })
    .value();

  var uniqueUserCountAfterwards = _(input)
    .values()
    .uniq()
    .size();

  /* Sanity check */
  assert(
    uniqueUserCountBefore === uniqueUserCountAfterwards,
    'Expected the number of users before and after the rollup to be the same (before: ' +
      uniqueUserCountBefore +
      ', after: ',
    uniqueUserCountAfterwards + ')'
  );
  return weekly;
};

BaseRetentionAnalyser.prototype.getUserInteractionsByDay = function(allCohortUsers, callback) {
  var self = this;

  this.getLoginDataPerDay(allCohortUsers, function(err, loginResults) {
    if (err) return callback(err);

    if (self.options.daily) {
      return callback(null, loginResults);
    }

    // Roll into weeks
    var weeklyUsage = self.rollupUsageIntoWeeks(loginResults);
    return callback(null, weeklyUsage);
  });
};

BaseRetentionAnalyser.prototype.getCohortUsersGrouped = function(start, end, callback) {
  var self = this;
  var newUserEvents = this.db.collection('gitter_new_user_events');

  newUserEvents.aggregate(
    [
      {
        $match: {
          t: { $gte: start, $lt: end }
        }
      },
      {
        $project: {
          userId: '$d.userId',
          period: { year: { $year: '$t' }, dayOfYear: { $dayOfYear: '$t' } }
        }
      },
      {
        $group: {
          _id: '$period',
          userIds: { $addToSet: '$userId' }
        }
      }
    ],
    function(err, periodData) {
      if (err) return callback(err);

      var newUsersByDay = _(periodData)
        .transform(function(result, dailyNewUsers) {
          var cohortDate = moment(
            cohortUtils.makeDate(dailyNewUsers._id.year, dailyNewUsers._id.dayOfYear)
          );

          // Turn days into weeks...
          if (!self.options.daily) {
            cohortDate = cohortUtils.getStartOfWeek(cohortDate);
          }

          var ts = cohortDate.valueOf();
          if (result[ts]) {
            result[ts] = result[ts].concat(dailyNewUsers.userIds);
          } else {
            result[ts] = dailyNewUsers.userIds;
          }
        }, {})
        .transform(function(result, userIds, timestamp) {
          result[timestamp] = _.uniq(userIds); // Probably not needed
        })
        .value();

      callback(null, newUsersByDay);
    }
  );
};

BaseRetentionAnalyser.prototype.buildCohortRetention = function(
  cohortTimestamp,
  cohortUserIds,
  dailyInteractingUsers,
  categorisedUsers
) {
  var cohortUsersIndexed = _(cohortUserIds)
    .transform(function(result, userId) {
      result[userId] = true;
    }, {})
    .value();

  var cohortDailyInteractingUsers = _(dailyInteractingUsers)
    .transform(function(result, userIds, timestamp) {
      var filteredUserIds = userIds.filter(function(userId) {
        return cohortUsersIndexed[userId];
      });

      if (filteredUserIds.length) {
        var byCategory = _(filteredUserIds)
          .transform(
            function(memo, userId) {
              var category = categorisedUsers[userId];

              if (memo[category]) {
                memo[category]++;
              } else {
                memo[category] = 1;
              }
            },
            {
              total: filteredUserIds.length
            }
          )
          .value();

        result[timestamp] = byCategory;
      }
    })
    .value();

  // Count how many users are in each category
  var categoryCounts = _(cohortUserIds)
    .transform(function(result, userId) {
      var category = categorisedUsers[userId];
      if (result[category]) {
        result[category]++;
      } else {
        result[category] = 1;
      }
    })
    .value();

  var allCategories = _(categoryCounts)
    .keys()
    .sort()
    .value();

  var subcohorts = _(allCategories)
    .transform(function(result, category) {
      result[category] = { total: categoryCounts[category] };
    }, {})
    .value();

  var totals = _(cohortDailyInteractingUsers)
    .keys()
    .sort()
    .transform(
      function(totals, time) {
        var interactions = cohortDailyInteractingUsers[time];

        var relativeDate = moment
          .duration(moment(parseInt(time, 10)).diff(parseInt(cohortTimestamp, 10)))
          .asDays();

        totals[relativeDate] = interactions.total;

        allCategories.forEach(function(category) {
          var subcohort = subcohorts[category];
          var value = interactions[category] || 0;
          subcohort[relativeDate] = value; // NB: side effect!
        });
      },
      {
        total: cohortUserIds.length
      }
    )
    .value();

  return {
    cohortTimestamp: moment(parseInt(cohortTimestamp, 10)).toDate(),
    cohortUsersCount: cohortUserIds.length,
    totals: totals,
    subcohorts: subcohorts
  };
};

BaseRetentionAnalyser.prototype.buildRetention = function(start, end, callback) {
  var self = this;

  self.debug('Finding cohort users');

  this.getCohortUsersGrouped(start, end, function(err, allCohortUsers) {
    if (err) return callback(err);

    /* Sanity check uniqueness of users */
    var userIds = _(allCohortUsers)
      .values()
      .flatten();
    assert(userIds.size() === userIds.uniq().size(), 'Duplicate users found in cohorts');

    var allCohortUsersCount = userIds.size();

    self.debug('Categorising cohort users');

    self.categoriseUsers(allCohortUsers, function(err, categorisedUsers) {
      if (err) return callback(err);

      /* Sanity checks for the categorisations */
      var categorisedUserCount = _(categorisedUsers)
        .keys()
        .size();
      assert(
        categorisedUserCount === allCohortUsersCount,
        'Categorised user count does not match all users'
      );

      self.debug('Getting user activity');

      /* Proceed with the interactions */
      self.getUserInteractionsByDay(allCohortUsers, function(err, dailyInteractingUsers) {
        if (err) return callback(err);

        self.debug('Crunching the numbers');

        /* Some more sanity checks */
        var limit = self.options.limit;
        var limitOfUsage;
        if (limit) {
          limitOfUsage = moment(end)
            .add(limit.amount, limit.unit)
            .valueOf();
        }

        Object.keys(dailyInteractingUsers).forEach(function(timestamp) {
          var ts = parseInt(timestamp, 10);
          assert(ts >= start.valueOf(), 'Activity before start');

          if (limitOfUsage) {
            assert(ts < limitOfUsage, 'Activity after end');
          }
        });

        /* Proceed with building the retention objects */
        var result = _(allCohortUsers)
          .keys()
          .sort()
          .map(function(cohortTimestamp) {
            var cohortUserIds = allCohortUsers[cohortTimestamp];
            return self.buildCohortRetention(
              cohortTimestamp,
              cohortUserIds,
              dailyInteractingUsers,
              categorisedUsers
            );
          })
          .value();

        callback(null, result);
      });
    });
  });
};

module.exports = BaseRetentionAnalyser;
