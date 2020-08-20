'use strict';

var assert = require('assert');
var mongooseUtils = require('../lib/mongoose-utils');
var mongoUtils = require('../lib/mongo-utils');
var persistence = require('gitter-web-persistence');
var Promise = require('bluebird');
var _ = require('lodash');

describe('mongoose-utils', function() {
  var username, x, y;

  beforeEach(function() {
    username = '_test_' + Date.now();
    x = 'Bob ' + Date.now();
    y = 'Bob ' + (Date.now() + 1000);
  });

  afterEach(function(done) {
    persistence.User.remove({ username: username }, done);
  });

  it('should create a new document', function(done) {
    mongooseUtils
      .upsert(persistence.User, { username: username }, { $setOnInsert: { displayName: x } })
      .spread(function(doc, updatedExisting) {
        assert.strictEqual(updatedExisting, false);
        assert.strictEqual(doc.username, username);
        assert.strictEqual(doc.displayName, x);
      })
      .nodeify(done);
  });

  it('should leanUpsertRaw', function() {
    return mongooseUtils
      .safeUpsertUpdate(persistence.User, { username: username }, { $set: { displayName: y } })
      .then(function(result) {
        assert.strictEqual(result.nModified, 0);
        assert.strictEqual(result.upserted.length, 1);
      });
  });

  it('should create a new document', function(done) {
    mongooseUtils
      .upsert(persistence.User, { username: username }, { $setOnInsert: { displayName: x } })
      .then(function() {
        return mongooseUtils.upsert(
          persistence.User,
          { username: username },
          { $setOnInsert: { displayName: y } }
        );
      })
      .spread(function(doc, updatedExisting) {
        assert.strictEqual(updatedExisting, true);
        assert.strictEqual(doc.username, username);
        assert.strictEqual(doc.displayName, x);
      })
      .then(function() {
        return mongooseUtils.upsert(
          persistence.User,
          { username: username },
          { $set: { displayName: y } }
        );
      })
      .spread(function(doc, updatedExisting) {
        assert.strictEqual(updatedExisting, true);
        assert.strictEqual(doc.username, username);
        assert.strictEqual(doc.displayName, y);
      })
      .nodeify(done);
  });

  it('should deal with stupid mongodb contention issues #slow', function() {
    var fakeUserId = mongoUtils.getNewObjectIdString();
    var fakeTroupeId = mongoUtils.getNewObjectIdString();

    function contentiousOperation() {
      return mongooseUtils.upsert(
        persistence.TroupeUser,
        {
          userId: fakeUserId,
          troupeId: fakeTroupeId
        },
        {
          $set: {},
          $setOnInsert: {
            userId: fakeUserId,
            troupeId: fakeTroupeId,
            flags: 1
          }
        }
      );
    }

    function iter() {
      return persistence.TroupeUser.remove({ userId: fakeUserId, troupeId: fakeTroupeId })
        .then(function() {
          return Promise.all([
            contentiousOperation(),
            contentiousOperation(),
            contentiousOperation(),
            contentiousOperation(),
            contentiousOperation(),
            contentiousOperation(),
            contentiousOperation()
          ]);
        })
        .then(function(results) {
          assert(
            results.every(function(result) {
              return !!result[0];
            })
          );

          var insertOps = results.filter(function(result) {
            return !result[1];
          });

          var updateOps = results.filter(function(result) {
            return result[1];
          });

          assert.strictEqual(insertOps.length, 1);
          assert.strictEqual(updateOps.length, 6);
        });
    }

    return Promise.each(_.range(20), iter);
  });

  describe('attachNotificationListenersToSchema', function() {
    it('should generate remove events', function() {
      var p = new Promise(function(resolve) {
        mongooseUtils.attachNotificationListenersToSchema(persistence.schemas.UserSchema, {
          onRemove: function(model) {
            resolve(model);
          }
        });
      });

      return mongooseUtils
        .upsert(persistence.User, { username: username }, { $setOnInsert: { displayName: x } })
        .spread(function() {
          return persistence.User.findOne({ username: username }).exec();
        })
        .then(function(user) {
          return user.remove();
        })
        .then(function() {
          return p;
        })
        .then(function(user) {
          assert.strictEqual(user.username, username);
        });
    });
  });
});
