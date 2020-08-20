'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var GitHubOrgCollaboratorService = require('../lib/github-org-collaborator-service');
var assert = require('assert');

describe('gitter-org-collaborators-service-test #github', function() {
  describe('integration #slow', function() {
    fixtureLoader.ensureIntegrationEnvironment('GITTER_INTEGRATION_ORG', '#integrationUser1');

    var fixture = fixtureLoader.setup({
      user1: '#integrationUser1'
    });

    it('should return org collabators', function() {
      var underTest = new GitHubOrgCollaboratorService(
        fixture.user1,
        fixtureLoader.GITTER_INTEGRATION_ORG
      );
      return underTest.findCollaborators().then(function(results) {
        assert(Array.isArray(results));
      });
    });
  });
});
