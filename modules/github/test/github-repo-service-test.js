/*global describe:true, it:true */
'use strict';

var assert = require('assert');
var GitHubRepoService = require('..').GitHubRepoService;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('github-repo-service #slow #github', function() {
  fixtureLoader.ensureIntegrationEnvironment(
    'GITTER_INTEGRATION_USERNAME',
    'GITTER_INTEGRATION_USER_SCOPE_TOKEN'
  );

  var FAKE_USER = {
    username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
    githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
  };

  var ghRepo;

  beforeEach(function() {
    ghRepo = new GitHubRepoService(FAKE_USER);
  });

  it('should list the repos for a user', function() {
    return ghRepo.getReposForUser('suprememoocow').then(function(repos) {
      assert(repos.length >= 1);
    });
  });

  it('should list the commits for a repo', function() {
    return ghRepo.getCommits('faye/faye', { firstPageOnly: true }).then(function(commits) {
      assert(commits.length >= 1);
    });
  });
});
