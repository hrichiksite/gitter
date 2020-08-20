'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var GitHubRepoCollaboratorService = require('../lib/github-repo-collaborator-service');
var assert = require('assert');

describe('github-repo-collaborators-service-test #github', function() {
  describe('integration #slow', function() {
    fixtureLoader.ensureIntegrationEnvironment('#integrationUser1');

    var fixture = fixtureLoader.setup({
      user1: '#integrationUser1'
    });

    it('should return suggestions for a PUBLIC REPO', function() {
      var underTest = new GitHubRepoCollaboratorService(fixture.user1, 'gitterHQ/gitter');
      return underTest.findCollaborators().then(function(userSuggestions) {
        assert(Array.isArray(userSuggestions));
        assert(userSuggestions.length > 0);
      });
    });

    it('should return repo collabators', function() {
      var underTest = new GitHubRepoCollaboratorService(
        fixture.user1,
        fixtureLoader.GITTER_INTEGRATION_REPO_FULL
      );
      return underTest.findCollaborators().then(function(results) {
        assert(Array.isArray(results));
      });
    });

    it('should return suggestions for a unknown REPO', function() {
      var underTest = new GitHubRepoCollaboratorService(fixture.user1, 'troupe/xyz');
      return underTest.findCollaborators().then(function(userSuggestions) {
        assert(Array.isArray(userSuggestions));
        assert.strictEqual(userSuggestions.length, 0);
      });
    });
  });
});
