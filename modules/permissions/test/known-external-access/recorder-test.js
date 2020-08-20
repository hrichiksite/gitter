'use strict';

var assert = require('assert');
var recorder = require('../../lib/known-external-access/recorder');
var ObjectID = require('mongodb').ObjectID;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('recorder', function() {
  describe('generateQuery', function() {
    var userId = new ObjectID();

    var FIXTURES = [
      {
        name: 'should handle both linkPath and externalId',
        userId: userId,
        type: 'type1',
        policyName: 'policyName',
        linkPath: 'linkPath',
        externalId: '123',
        expectedQuery: {
          $or: [
            {
              userId: userId,
              type: 'type1',
              policyName: 'policyName',
              linkPath: 'linkPath'
            },
            {
              userId: userId,
              type: 'type1',
              policyName: 'policyName',
              externalId: '123'
            }
          ]
        }
      },
      {
        name: 'should handle just linkPath',
        userId: userId,
        type: 'type1',
        policyName: 'policyName',
        linkPath: 'linkPath',
        externalId: null,
        expectedQuery: {
          userId: userId,
          type: 'type1',
          policyName: 'policyName',
          linkPath: 'linkPath'
        }
      },
      {
        name: 'should handle just externalId',
        userId: userId,
        type: 'type1',
        policyName: 'policyName',
        linkPath: null,
        externalId: '123',
        expectedQuery: {
          userId: userId,
          type: 'type1',
          policyName: 'policyName',
          externalId: '123'
        }
      },
      {
        name: 'should handle externalId being null',
        userId: userId,
        type: 'type1',
        policyName: 'policyName',
        linkPath: '123',
        externalId: null,
        expectedQuery: {
          linkPath: '123',
          userId: userId,
          type: 'type1',
          policyName: 'policyName'
        }
      }
    ];

    describe('queryies', function() {
      FIXTURES.forEach(function(meta) {
        it(meta.name, function() {
          var query = recorder.testOnly.generateQuery(
            meta.userId,
            meta.type,
            meta.policyName,
            meta.linkPath,
            meta.externalId
          );
          assert.deepEqual(query, meta.expectedQuery);
        });
      });
    });

    describe('operations #slow', function() {
      fixtureLoader.disableMongoTableScans();

      FIXTURES.forEach(function(meta) {
        it(meta.name, function() {
          return recorder.testOnly
            .handle(meta.userId, meta.type, meta.policyName, meta.linkPath, meta.externalId, true)
            .then(function(insertedOrRemoved) {
              assert.strictEqual(insertedOrRemoved, true);
              return recorder.testOnly.handle(
                meta.userId,
                meta.type,
                meta.policyName,
                meta.linkPath,
                meta.externalId,
                true
              );
            })
            .then(function(insertedOrRemoved) {
              assert.strictEqual(insertedOrRemoved, false);
              return recorder.testOnly.handle(
                meta.userId,
                meta.type,
                meta.policyName,
                meta.linkPath,
                meta.externalId,
                false
              );
            })
            .then(function(insertedOrRemoved) {
              assert.strictEqual(insertedOrRemoved, true);
              return recorder.testOnly.handle(
                meta.userId,
                meta.type,
                meta.policyName,
                meta.linkPath,
                meta.externalId,
                false
              );
            })
            .then(function(insertedOrRemoved) {
              assert.strictEqual(insertedOrRemoved, false);
            });
        });
      });
    });

    describe('Additional tests #slow', function() {
      fixtureLoader.disableMongoTableScans();

      it('should handle externalIds and linkPaths are equivalent', function() {
        var userId = new ObjectID();

        return recorder.testOnly
          .handle(userId, 'type2', 'policyName1', 'bob', '123', true)
          .then(function(insertedOrRemoved) {
            assert.strictEqual(insertedOrRemoved, true);

            return recorder.testOnly.handle(userId, 'type2', 'policyName1', null, '123', true);
          })
          .then(function(insertedOrRemoved) {
            assert.strictEqual(insertedOrRemoved, false);

            return recorder.testOnly.handle(userId, 'type2', 'policyName1', 'bob', null, true);
          })
          .then(function(insertedOrRemoved) {
            assert.strictEqual(insertedOrRemoved, true);
          });
      });

      it('should deal with externalIds and linkPaths becoming associated after each has been inserted', function() {
        var userId = new ObjectID();

        return recorder.testOnly
          .handle(userId, 'type2', 'policyName1', 'bob2', null, true)
          .then(function(insertedOrRemoved) {
            assert.strictEqual(insertedOrRemoved, true);

            return recorder.testOnly.handle(userId, 'type2', 'policyName1', null, '456', true);
          })
          .then(function(insertedOrRemoved) {
            assert.strictEqual(insertedOrRemoved, true);

            return recorder.testOnly.handle(userId, 'type2', 'policyName1', 'bob2', '456', true);
          })
          .then(function(insertedOrRemoved) {
            assert.strictEqual(insertedOrRemoved, true);
            return recorder.testOnly.handle(userId, 'type2', 'policyName1', 'bob2', null, true);
          })
          .then(function(insertedOrRemoved) {
            assert.strictEqual(insertedOrRemoved, false);
          });
      });
    });
  });
});
