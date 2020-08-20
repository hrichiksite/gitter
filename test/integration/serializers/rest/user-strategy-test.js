'use strict';

var testRequire = require('../../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assertUtils = require('../../assert-utils');
var env = require('gitter-web-env');
var nconf = env.config;
var serialize = require('gitter-web-serialization/lib/serialize');
var UserStrategy = testRequire('./serializers/rest/user-strategy');
var UserIdStrategy = testRequire('./serializers/rest/user-id-strategy');

describe('user-strategy-test', function() {
  var blockTimer = require('gitter-web-test-utils/lib/block-timer');
  var expected1, expectedLean;

  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setup({
    user1: {},
    user2: {},
    troupe1: { users: ['user1'] }
  });

  beforeEach(function() {
    expected1 = [
      {
        id: fixture.user1.id,
        username: fixture.user1.username,
        displayName: fixture.user1.displayName,
        url: '/' + fixture.user1.username,
        avatarUrl: nconf.get('avatar:officialHost') + '/g/u/' + fixture.user1.username,
        avatarUrlSmall: '/api/private/user-avatar/' + fixture.user1.username + '?s=60',
        avatarUrlMedium: '/api/private/user-avatar/' + fixture.user1.username + '?s=128',
        staff: false,
        v: 1
      }
    ];

    expectedLean = [
      {
        id: fixture.user1.id,
        username: fixture.user1.username,
        v: 1
      }
    ];
  });

  describe('user-serializer', function() {
    it('should serialize a user', function() {
      var strategy = new UserStrategy({});
      return serialize([fixture.user1], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expected1);
      });
    });

    it('should serialize a user with lean=true', function() {
      var strategy = new UserStrategy({ lean: true });
      return serialize([fixture.user1], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expectedLean);
      });
    });

    it('should serialize a user with includeRolesForTroupeId', function() {
      var strategy = new UserStrategy({ includeRolesForTroupeId: fixture.troupe1.id });
      return serialize([fixture.user1], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expected1);
      });
    });

    it('should serialize a user with showPresenceForTroupeId', function() {
      var strategy = new UserStrategy({ showPresenceForTroupeId: fixture.troupe1.id });
      return serialize([fixture.user1], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expected1);
      });
    });

    it('should serialize a user with showPremiumStatus', function() {
      var strategy = new UserStrategy({ showPremiumStatus: true });
      return serialize([fixture.user1], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expected1);
      });
    });

    it('should serialize a user with includeProviders', function() {
      fixture.user2.username = 'githubuser';
      var strategy = new UserStrategy({ includeProviders: true });
      return serialize([fixture.user2], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, [
          {
            id: fixture.user2.id,
            username: fixture.user2.username,
            displayName: fixture.user2.displayName,
            url: '/' + fixture.user2.username,
            avatarUrl: nconf.get('avatar:officialHost') + '/gh/u/githubuser',
            avatarUrlSmall: 'https://avatars2.githubusercontent.com/githubuser?&s=60',
            avatarUrlMedium: 'https://avatars2.githubusercontent.com/githubuser?&s=128',
            staff: false,
            providers: ['github'],
            v: 1
          }
        ]);
      });
    });
  });

  describe('user-id-serializer', function() {
    it('should serialize a user', function() {
      var strategy = new UserIdStrategy({});
      return serialize([fixture.user1.id], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expected1);
      });
    });

    it('should serialize a user with lean=true', function() {
      var strategy = new UserIdStrategy({ lean: true });
      return serialize([fixture.user1.id], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expectedLean);
      });
    });

    it('should serialize a user with includeRolesForTroupeId', function() {
      var strategy = new UserIdStrategy({ includeRolesForTroupeId: fixture.troupe1.id });
      return serialize([fixture.user1.id], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expected1);
      });
    });

    it('should serialize a user with showPresenceForTroupeId', function() {
      var strategy = new UserIdStrategy({ showPresenceForTroupeId: fixture.troupe1.id });
      return serialize([fixture.user1.id], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expected1);
      });
    });

    it('should serialize a user with showPremiumStatus', function() {
      var strategy = new UserIdStrategy({ showPremiumStatus: true });
      return serialize([fixture.user1.id], strategy).then(function(s) {
        assertUtils.assertSerializedEqual(s, expected1);
      });
    });
  });
});
