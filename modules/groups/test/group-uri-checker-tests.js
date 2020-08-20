'use strict';

var StatusError = require('statuserror');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var groupUriChecker = require('../lib/group-uri-checker');

describe('group-uri-checker #slow', function() {
  fixtureLoader.ensureIntegrationEnvironment('#integrationUser1', 'GITTER_INTEGRATION_ORG');

  describe('org group present', function() {
    var fixture = fixtureLoader.setup({
      deleteDocuments: {
        Troupe: [
          {
            lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase()
          }
        ],
        Group: [
          {
            lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase()
          }
        ]
      },
      user1: '#integrationUser1',
      group2: {
        uri: fixtureLoader.GITTER_INTEGRATION_ORG,
        lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase(),
        securityDescriptor: {
          externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID,
          linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
          public: true,
          admins: 'GH_ORG_MEMBER',
          members: 'PUBLIC',
          type: 'GH_ORG'
        }
      }
    });

    it('should not allow creation if a group with that uri already exists and pertains to a GitHub org', function() {
      return groupUriChecker(fixture.user1, fixtureLoader.GITTER_INTEGRATION_ORG).then(function(
        info
      ) {
        assert.strictEqual(info.allowCreate, false);
        assert.strictEqual(info.localUriExists, true);
      });
    });
  });

  describe('without org group present', function() {
    var fixture = fixtureLoader.setup({
      deleteDocuments: {
        Group: [
          { lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() },
          { lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() }
        ]
      },
      user1: '#integrationUser1',
      user2: '#integrationCollabUser1',
      group1: {},
      troupe1: {}
    });

    it('should throw an error if you pass in an invalid group uri', function() {
      return groupUriChecker(fixture.user1, 'about')
        .then(function() {
          assert.ok(false, 'Error expected');
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 400);
        });
    });

    // see group-uri-checker.js. This check was disabled for now.
    /*
    it('should not allow creation if a gitter user with that username exists', function() {
      return groupUriChecker(fixture.user1, fixture.user1.username)
        .then(function(info) {
          assert.strictEqual(info.allowCreate, false);
        });
    });
    */

    it('should not allow creation if a group with that uri already exists', function() {
      return groupUriChecker(fixture.user1, fixture.group1.uri).then(function(info) {
        assert.strictEqual(info.allowCreate, false);
        assert.strictEqual(info.localUriExists, true);
      });
    });

    it('should allow creation if a gh org with that login exists and the user has admin access', function() {
      return groupUriChecker(fixture.user1, fixtureLoader.GITTER_INTEGRATION_ORG).then(function(
        info
      ) {
        assert.strictEqual(info.type, 'GH_ORG');
        assert.strictEqual(info.allowCreate, true);
        assert.strictEqual(info.localUriExists, false);
      });
    });

    it('should allow creation if the uri is not taken in any way', function() {
      return groupUriChecker(fixture.user1, '_this-should-not-exist').then(function(info) {
        assert.strictEqual(info.type, null);
        assert.strictEqual(info.allowCreate, true);
        assert.strictEqual(info.localUriExists, false);
      });
    });

    it('should allow creation if a gh user with that login exists and you are that user ', function() {
      return groupUriChecker(fixture.user1, fixtureLoader.GITTER_INTEGRATION_USERNAME).then(
        function(info) {
          assert.strictEqual(info.allowCreate, true);
          assert.strictEqual(info.localUriExists, false);
        }
      );
    });

    it('should not allow creation if a gh user with that login exists and you are not that user', function() {
      return groupUriChecker(fixture.user2, fixtureLoader.GITTER_INTEGRATION_USERNAME).then(
        function(info) {
          assert.strictEqual(info.allowCreate, false);
          assert.strictEqual(info.localUriExists, false);
        }
      );
    });

    it('should allow creation if user with repo access to the repo (collaborator)', function() {
      // This is for the jashkenas/backbone case when it has to upsert jashkenas
      // when any contributor for that repo comes along.
      // NOTE that we're passing in obtainAccessFromGitHubRepo
      return groupUriChecker(
        fixture.user2,
        fixtureLoader.GITTER_INTEGRATION_USERNAME,
        fixtureLoader.GITTER_INTEGRATION_REPO_FULL
      ).then(function(info) {
        assert.strictEqual(info.allowCreate, true);
        assert.strictEqual(info.localUriExists, false);
      });
    });

    it('should not allow creation if user without repo access to the repo', function() {
      // simular to above, this is the case where you DON'T have push access.
      return groupUriChecker(
        fixture.user2,
        fixtureLoader.GITTER_INTEGRATION_USERNAME,
        fixtureLoader.GITTER_INTEGRATION_REPO2_FULL
      ).then(function(info) {
        assert.strictEqual(info.allowCreate, false);
        assert.strictEqual(info.localUriExists, false);
      });
    });
  });
});
