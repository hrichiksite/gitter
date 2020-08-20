/*global describe:true, it:true */
'use strict';

var assert = require('assert');
var GithubMeService = require('..').GitHubMeService;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('github-me-service #slow #github', function() {
  fixtureLoader.ensureIntegrationEnvironment(
    'GITTER_INTEGRATION_USERNAME',
    'GITTER_INTEGRATION_USER_SCOPE_TOKEN',
    'GITTER_INTEGRATION_ORG'
  );

  var FAKE_USER = {
    username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
    githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
  };

  it('members should detailed emailed', function(done) {
    var gh = new GithubMeService(FAKE_USER);

    gh.getEmail()
      .then(function(email) {
        assert(email);
      })
      .nodeify(done);
  });

  describe('test org admin status', function() {
    it('should return true if the user is an admin', function(done) {
      var gh = new GithubMeService(FAKE_USER);

      gh.isOrgAdmin(fixtureLoader.GITTER_INTEGRATION_ORG)
        .then(function(isAdmin) {
          assert(isAdmin);
        })
        .nodeify(done);
    });

    it('should return false if the user is not an admin', function(done) {
      var gh = new GithubMeService(FAKE_USER);

      gh.isOrgAdmin('gitterHQ')
        .then(function(isAdmin) {
          assert(!isAdmin);
        })
        .nodeify(done);
    });

    it('should return false if the org does not exist', function(done) {
      var gh = new GithubMeService(FAKE_USER);

      gh.isOrgAdmin('gitterHQTestingDoesNotExistOkay')
        .then(function(isAdmin) {
          assert(!isAdmin);
        })
        .nodeify(done);
    });
  });

  it('should return that you are and org admin when you are', function(done) {
    var gh = new GithubMeService(FAKE_USER);

    gh.isOrgAdmin(fixtureLoader.GITTER_INTEGRATION_ORG)
      .then(function(isOrgMember) {
        assert(isOrgMember);
      })
      .nodeify(done);
  });

  it('should return that you are and org member when you are', function(done) {
    var gh = new GithubMeService(FAKE_USER);

    gh.isOrgMember(fixtureLoader.GITTER_INTEGRATION_ORG)
      .then(function(isOrgMember) {
        assert(isOrgMember);
      })
      .nodeify(done);
  });

  it('should return org membership', function(done) {
    var gh = new GithubMeService(FAKE_USER);

    gh.getOrgMembership(fixtureLoader.GITTER_INTEGRATION_ORG)
      .then(function(membership) {
        assert('gitterTest', membership.organization.login);
        assert('gittertestbot', membership.user.login);
      })
      .nodeify(done);
  });

  it('should list all orgs the user is a member of', function(done) {
    var gh = new GithubMeService(FAKE_USER);

    gh.getOrgs()
      .then(function(membership) {
        assert(Array.isArray(membership));
        assert(membership.length >= 1);
      })
      .nodeify(done);
  });
});
