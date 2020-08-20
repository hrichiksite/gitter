/*global describe:true, it:true */
'use strict';

var assert = require('assert');
var GithubOrgService = require('..').GitHubOrgService;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('github-org-service #slow #github', function() {
  fixtureLoader.ensureIntegrationEnvironment(
    'GITTER_INTEGRATION_USERNAME',
    'GITTER_INTEGRATION_USER_SCOPE_TOKEN',
    'GITTER_INTEGRATION_ORG',
    'GITTER_INTEGRATION_COLLAB_USERNAME'
  );

  var GITTER_TEST_BOT = {
    username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
    githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
  };

  describe('members', function() {
    it('should fetch members', function(done) {
      var gh = new GithubOrgService(GITTER_TEST_BOT);

      gh.members(fixtureLoader.GITTER_INTEGRATION_ORG)
        .then(function(members) {
          assert(members.length >= 1);
        })
        .nodeify(done);
    });

    it('should return true if a user checks that it is in an org', function(done) {
      var gh = new GithubOrgService(GITTER_TEST_BOT);

      gh.member(fixtureLoader.GITTER_INTEGRATION_ORG, fixtureLoader.GITTER_INTEGRATION_USERNAME)
        .then(function(isMember) {
          assert(isMember);
        })
        .nodeify(done);
    });

    it('should return true if a user checks that another member is in an org', function(done) {
      var gh = new GithubOrgService(GITTER_TEST_BOT);

      gh.member(
        fixtureLoader.GITTER_INTEGRATION_ORG,
        fixtureLoader.GITTER_INTEGRATION_COLLAB_USERNAME
      )
        .then(function(isMember) {
          assert(isMember);
        })
        .nodeify(done);
    });

    it('should return false if a user checks that it is in an org that it is not a member of', function(done) {
      var gh = new GithubOrgService(GITTER_TEST_BOT);

      gh.member('adobe', fixtureLoader.GITTER_INTEGRATION_USERNAME)
        .then(function(isMember) {
          assert(!isMember);
        })
        .nodeify(done);
    });

    it('should return false if a user checks that a stranger is in the users org', function(done) {
      var gh = new GithubOrgService(GITTER_TEST_BOT);

      gh.member(fixtureLoader.GITTER_INTEGRATION_ORG, 'indexzero')
        .then(function(isMember) {
          assert(!isMember);
        })
        .nodeify(done);
    });

    it('should return membership information for an org', function(done) {
      var gh = new GithubOrgService(GITTER_TEST_BOT);

      gh.getMembership(
        fixtureLoader.GITTER_INTEGRATION_ORG,
        fixtureLoader.GITTER_INTEGRATION_USERNAME
      )
        .then(function(membership) {
          assert.strictEqual(membership.organization.login, fixtureLoader.GITTER_INTEGRATION_ORG);
          assert.strictEqual(membership.user.login, fixtureLoader.GITTER_INTEGRATION_USERNAME);
        })
        .nodeify(done);
    });
  });
});
