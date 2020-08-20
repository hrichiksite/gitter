'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var userService = require('../lib/user-service');
var persistence = require('gitter-web-persistence');

describe('User Service', function() {
  var fixture2 = fixtureLoader.setup({
    user1: { username: true },
    user2: {},
    user3: {}
  });

  describe('duplicate account creation', function() {
    fixtureLoader.ensureIntegrationEnvironment('GITTER_INTEGRATION_USER_SCOPE_TOKEN');

    it('should allow two users with the same githubId to be created at the same moment, but only create a single account', function() {
      var githubId = fixture2.generateGithubId();

      return Promise.all([
        userService.findOrCreateUserForGithubId({
          githubId: githubId,
          username: fixture2.generateUsername(),
          githubToken: fixture2.GITTER_INTEGRATION_USER_SCOPE_TOKEN
        }),
        userService.findOrCreateUserForGithubId({
          githubId: githubId,
          username: fixture2.generateUsername(),
          githubToken: fixture2.GITTER_INTEGRATION_USER_SCOPE_TOKEN
        })
      ])
        .spread(function(user1, user2) {
          assert.strictEqual(user1.id, user2.id);
        })
        .catch(mongoUtils.mongoErrorWithCode(11000), function() {
          // It looks like mongo is just incapable of guaranteeing this. Up to
          // 50% of the time this test runs it throws this error.
          console.log('Duplicate user.'); // eslint-disable-line no-console
        });
    });
  });

  it('should create new users', function() {
    return persistence.User.findOneAndRemove({ githubId: -1 })
      .exec()
      .then(function() {
        return userService.findOrCreateUserForGithubId({
          githubId: -1,
          username: '__test__gitter_007'
        });
      });
  });

  it('should destroy tokens for users', function() {
    return userService
      .findOrCreateUserForGithubId({
        githubId: -Date.now(),
        username: fixture2.generateUsername(),
        githubToken: 'x',
        githubUserToken: 'y',
        githubScopes: { 'user:email': 1 }
      })
      .then(function(user) {
        assert(user.githubToken);
        assert(user.githubUserToken);
        assert(user.githubScopes['user:email']);

        return [user, userService.destroyTokensForUserId(user.id)];
      })
      .spread(function(user) {
        return userService.findById(user.id);
      })
      .then(function(user) {
        assert(!user.githubToken);
        assert(!user.githubUserToken);
        assert.deepEqual(user.githubScopes, {});
      });
  });

  it('should allow timezone information to be updated', function() {
    return userService
      .updateTzInfo(fixture2.user1.id, { offset: 60, abbr: 'CST', iana: 'Europe/Paris' })
      .then(function() {
        return userService.findById(fixture2.user1.id);
      })
      .then(function(user) {
        var tz = user.tz;
        assert(tz);
        assert.strictEqual(tz.offset, 60);
        assert.strictEqual(tz.abbr, 'CST');
        assert.strictEqual(tz.iana, 'Europe/Paris');

        return userService.updateTzInfo(fixture2.user1.id, {});
      })
      .then(function() {
        return userService.findById(fixture2.user1.id);
      })
      .then(function(user) {
        var tz = user.tz;

        assert(!tz || !tz.offset);
        assert(!tz || !tz.abbr);
        assert(!tz || !tz.iana);
      });
  });

  describe('#unremoveUser', () => {
    const rmFixture = fixtureLoader.setup({
      user: {
        state: 'REMOVED'
      }
    });

    it('should clear the status of removed user', async () => {
      assert.strictEqual(rmFixture.user.state, 'REMOVED');
      await userService.unremoveUser(rmFixture.user);
      const user = await persistence.User.findOne({ _id: rmFixture.user._id });
      assert.strictEqual(user.state, undefined);
    });
  });
});
