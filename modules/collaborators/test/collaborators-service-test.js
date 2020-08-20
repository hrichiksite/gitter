'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var collaboratorsService = require('../lib/collaborators-service');
var assert = require('assert');

function assertNoDuplicates(collaborators) {
  var logins = {};
  collaborators.forEach(function(collaborator) {
    // TODO: add other services into this test
    assert(!logins[collaborator.externalId]);
    logins[collaborator.githubUsername] = true;
  });
}

describe('collaborators-service #slow #github', function() {
  // These tests timeout at 10000 sometimes otherwise
  this.timeout(30000);

  fixtureLoader.ensureIntegrationEnvironment('#integrationUser1');

  var fixture = fixtureLoader.setup({
    user1: '#integrationUser1'
  });

  it('should return collaborators for a PUBLIC REPO', function() {
    return collaboratorsService
      .findCollaborators(fixture.user1, 'GH_REPO', 'gitterHQ/gitter')
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        assert(collaborators.length > 0);
        assert(collaborators[0].externalId);
        assert(collaborators[0].type === 'github');
        assertNoDuplicates(collaborators);
      });
  });

  it('should return collaborators for a PRIVATE REPO', function() {
    return collaboratorsService
      .findCollaborators(fixture.user1, 'GH_REPO', 'troupe/gitter-webapp')
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        assert(collaborators.length > 0);
        assert(collaborators[0].externalId);
        assert(collaborators[0].type === 'github');
        assertNoDuplicates(collaborators);
      });
  });

  it('should return collaborators for a unknown REPO', function() {
    return collaboratorsService
      .findCollaborators(fixture.user1, 'GH_REPO', 'troupe123123123/xy123123123z')
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        assertNoDuplicates(collaborators);
      });
  });

  it('should return collaborators for an ORG', function() {
    return collaboratorsService
      .findCollaborators(fixture.user1, 'GH_ORG', 'troupe')
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        assert(collaborators.length > 0);
        assert(collaborators[0].externalId);
        assert(collaborators[0].type === 'github');
        assertNoDuplicates(collaborators);
      });
  });

  it('should return collaborators for an USER', function() {
    return collaboratorsService
      .findCollaborators(fixture.user1, null, null)
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        // assert(collaborators.length > 0);
        // assert(collaborators[0].githubUsername);
        assertNoDuplicates(collaborators);
      });
  });
});
