'use strict';

var makeBenchmark = require('../make-benchmark');
var persistence = require('gitter-web-persistence');
var _ = require('lodash');

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

function useAggregation(groupId) {
  return persistence.Troupe.aggregate([
    {
      $match: {
        groupId: groupId
      }
    },
    {
      $lookup: {
        from: 'securitydescriptors',
        localField: '_id',
        foreignField: 'troupeId',
        as: 'sd'
      }
    },
    {
      $unwind: {
        path: '$sd'
      }
    }
  ]).exec();
}

function useQuery(groupId) {
  return persistence.Troupe.find({
    groupId: groupId,
    security: 'PUBLIC'
  })
    .lean()
    .exec();
}

function doubleQuery(groupId) {
  return persistence.Troupe.find({
    groupId: groupId
  })
    .lean()
    .then(function(rooms) {
      var troupeIds = _.map(rooms, function(room) {
        return room._id;
      });

      return persistence.SecurityDescriptor.find({
        troupeId: { $in: troupeIds }
      }).then(function(securityDescriptions) {
        var hashed = _.reduce(
          securityDescriptions,
          function(memo, sd) {
            memo[sd.troupeId] = sd;
            return memo;
          },
          {}
        );

        _.forEach(rooms, function(room) {
          room.sd = hashed[room._id];
        });
      });
    });
}

var fixture;

makeBenchmark({
  maxTime: 3,
  // initCount: 100,
  before: function(done) {
    var expected = {
      group1: {},
      group2: {},
      user1: {}
    };

    for (var i = 0; i < 600; i++) {
      expected['troupe' + i] = { group: 'group1', security: 'PUBLIC' };
    }

    for (i = 0; i < 20; i++) {
      expected['troupe' + i] = { group: 'group2', security: 'PUBLIC' };
    }

    return fixtureLoader
      .createExpectedFixtures(expected)
      .then(function(f) {
        fixture = f;
      })
      .asCallback(done);
  },

  tests: {
    useQueryBig: function(done) {
      return useQuery(fixture.group1._id, fixture.user1._id).asCallback(done);
    },
    useAggregationBig: function(done) {
      return useAggregation(fixture.group1._id, fixture.user1._id).asCallback(done);
    },
    useDoubleQueryBig: function(done) {
      return doubleQuery(fixture.group1._id, fixture.user1._id).asCallback(done);
    },

    useQuerySmall: function(done) {
      return useQuery(fixture.group2._id, fixture.user1._id).asCallback(done);
    },
    useAggregationSmall: function(done) {
      return useAggregation(fixture.group2._id, fixture.user1._id).asCallback(done);
    },
    useDoubleQuerySmall: function(done) {
      return doubleQuery(fixture.group2._id, fixture.user1._id).asCallback(done);
    }
  }
});
