'use strict';

var speedy = require('speedy');
var persistence = require('gitter-web-persistence');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');

onMongoConnect(function() {
  speedy.run({
    withSelect: function(done) {
      console.log(persistence.Troupe);
      persistence.Troupe.find({}, { uri: 1, oneToOne: 1, users: 1 })
        // .lean()
        // .limit(100)
        .exec(done);
    },

    withAggregation: function(done) {
      persistence.Troupe.aggregate([
        // { $limit: 100 },
        {
          $project: {
            uri: 1,
            oneToOne: 1,
            users: {
              $cond: {
                if: {
                  $eq: ['$oneToOne', true]
                },
                then: '$users',
                else: undefined
              }
            }
          }
        }
      ]).exec(function() {
        done();
      });
    }
  });
});
