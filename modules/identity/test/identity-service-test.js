'use strict';

var identityService = require('../lib/identity-service');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var Identity = require('gitter-web-persistence').Identity;

describe('identityService', function() {
  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      User: [
        // use this as a proxy for githubId: null.
        { username: '_fake_google_user1_test' },
        // clean up the githubId has it is actually unique
        { githubId: true }
      ],
      Identity: [{ provider: 'google', providerKey: 'google-identity' }]
    },
    user1: {
      // githubId has to be unique, so there can only be one null..
      githubId: null,
      githubToken: null,
      username: '_fake_google_user1_test'
    },
    user2: {
      githubId: true,
      githubToken: true
    },
    identity1: {
      user: 'user1',
      provider: 'google',
      providerKey: 'google-identity',
      username: 'some-google-username'
    }
  });

  describe('getIdentityForUser', function() {
    it('works for non github users', function() {
      return identityService.getIdentityForUser(fixture.user1, 'google').then(function(identity) {
        assert.equal(identity.provider, 'google');
      });
    });

    it('works for github users', function() {
      return identityService.getIdentityForUser(fixture.user2, 'github').then(function(identity) {
        assert.equal(identity.provider, 'github');
      });
    });
  });

  describe('listProvidersForUser', function() {
    it('works for non github users', function() {
      return identityService.listProvidersForUser(fixture.user1).then(function(providers) {
        assert.deepEqual(providers, ['google']);
      });
    });

    it('works for github users', function() {
      return identityService.listProvidersForUser(fixture.user2).then(function(providers) {
        assert.deepEqual(providers, ['github']);
      });
    });
  });

  describe('listForUser', function() {
    describe('non-github users', function() {
      it('returns the identities', function() {
        return identityService.listForUser(fixture.user1).then(function(identities) {
          assert.deepEqual(identities, [
            {
              provider: 'google',
              providerKey: 'google-identity',
              username: 'some-google-username',
              displayName: null,
              email: null,
              accessToken: null,
              refreshToken: null,
              avatar: null
            }
          ]);
        });
      });

      it('returns the cached identities', function() {
        var identities1;
        return identityService
          .listForUser(fixture.user1)
          .then(function(identities) {
            identities1 = identities;
            return identityService.listForUser(fixture.user1);
          })
          .then(function(identities2) {
            assert.equal(identities2, identities1);
          });
      });
    });

    describe('github users', function() {
      it('returns the identities', function() {
        var user = fixture.user2;
        return identityService.listForUser(user).then(function(identities) {
          assert.deepEqual(identities, [
            {
              provider: 'github',
              providerKey: user.githubId,
              username: user.username,
              displayName: user.displayName,
              email: null,
              accessToken: user.githubUserToken,
              refreshToken: null,
              accessTokenSecret: null,
              upgradedAccessToken: user.githubToken,
              scopes: user.githubScopes,
              avatar: user.gravatarImageUrl
            }
          ]);
        });
      });

      it('returns the cached identities', function() {
        var identities1;
        return identityService
          .listForUser(fixture.user2)
          .then(function(identities) {
            identities1 = identities;
            return identityService.listForUser(fixture.user2);
          })
          .then(function(identities2) {
            assert.deepEqual(identities2, identities1);
          });
      });
    });
  });

  describe('removeForUser', function() {
    describe('non-github users', function() {
      it('removes the identities', function() {
        assert.strictEqual(fixture.user1.identities.length, 1);

        return identityService
          .removeForUser(fixture.user1)
          .then(() => Identity.find({ userId: fixture.user1._id }))
          .then(function(identities) {
            assert.strictEqual(identities.length, 0);
          });
      });
    });
  });
});
