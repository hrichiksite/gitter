'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var troupeService = require('../lib/troupe-service');

describe('troupe-service', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    user2: {},
    troupe1: {
      users: ['user1', 'user2']
    },
    troupe2: {}
  });

  describe('#findByIdLeanWithMembership', function() {
    it('should find a room which exists and the user has access', function(done) {
      troupeService
        .findByIdLeanWithMembership(fixture.troupe1.id, fixture.user1.id)
        .spread(function(room, access) {
          assert.strictEqual(room.id, fixture.troupe1.id);
          assert.strictEqual(access, true);
        })
        .nodeify(done);
    });

    it('should find a room which exists and the does not have access', function(done) {
      troupeService
        .findByIdLeanWithMembership(fixture.troupe2.id, fixture.user1.id)
        .spread(function(room, access) {
          assert(room);
          assert.strictEqual(room.id, fixture.troupe2.id);
          assert.strictEqual(access, false);
        })
        .nodeify(done);
    });

    it('should not find a room which does not exist, for a user', function(done) {
      troupeService
        .findByIdLeanWithMembership(mongoUtils.getNewObjectIdString(), fixture.user1.id)
        .spread(function(room, access) {
          assert(!room);
          assert(!access);
        })
        .nodeify(done);
    });

    it('should find a room which exists and for anon', function(done) {
      troupeService
        .findByIdLeanWithMembership(fixture.troupe2.id, null)
        .spread(function(room, access) {
          assert(room);
          assert(!access);
        })
        .nodeify(done);
    });

    it('should not find a room which does not exist for anon', function(done) {
      troupeService
        .findByIdLeanWithMembership(mongoUtils.getNewObjectIdString(), null)
        .spread(function(room, access) {
          assert(!room);
          assert(!access);
        })
        .nodeify(done);
    });
  });
});
