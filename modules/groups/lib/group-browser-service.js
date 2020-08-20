'use strict';

var Promise = require('bluebird');
var Troupe = require('gitter-web-persistence').Troupe;
var assert = require('assert');
var groupRoomFinder = require('./group-room-finder');

function sumUserCountForQuery(query) {
  return Troupe.aggregate([
    {
      $match: query
    },
    {
      $group: {
        _id: '1',
        count: { $sum: '$userCount' }
      }
    },
    {
      $project: {
        _id: 0,
        count: 1
      }
    }
  ])
    .exec()
    .then(function(results) {
      return (results && results[0] && results[0].count) || 0;
    });
}

function findRoomsWithPagination(groupId, userId, options) {
  assert(groupId, 'groupId is required');

  return groupRoomFinder.queryForAccessibleRooms(groupId, userId).then(function(query) {
    var pipeline = [
      { $match: query },
      {
        $sort: {
          userCount: -1,
          uri: 1
        }
      }
    ];

    if (options && options.skip && options.skip > 0) {
      pipeline.push({
        $skip: options.skip
      });
    }

    var limit = (options && options.limit) || 30;
    pipeline.push({
      $limit: limit
    });

    if (options.includeUsers) {
      pipeline.push(
        {
          $lookup: {
            from: 'troupeusers',
            localField: '_id',
            foreignField: 'troupeId',
            as: 'troupeuser'
          }
        },
        {
          $project: {
            _id: 1,
            uri: 1,
            userCount: 1,
            userIds: {
              $slice: ['$troupeuser', 10]
            }
          }
        },
        {
          $project: {
            _id: 1,
            uri: 1,
            userCount: 1,
            userIds: {
              $map: {
                input: '$userIds',
                as: 'troupeuser',
                in: '$$troupeuser.userId'
              }
            }
          }
        }
      );
    }

    return Promise.join(
      Troupe.aggregate(pipeline).exec(),
      Troupe.count(query),
      sumUserCountForQuery(query),
      function(results, total, totalUsers) {
        return {
          results: results,
          total: total,
          totalUsers: totalUsers
        };
      }
    );
  });
}

module.exports = {
  findRoomsWithPagination: findRoomsWithPagination
};
