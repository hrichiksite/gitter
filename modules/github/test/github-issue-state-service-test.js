/* global describe:true, it:true */
'use strict';

var assert = require('assert');
var GitHubIssueStateService = require('..').GitHubIssueStateService;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('github-issue-state-search #slow #github', function() {
  fixtureLoader.ensureIntegrationEnvironment(
    'GITTER_INTEGRATION_USERNAME',
    'GITTER_INTEGRATION_USER_SCOPE_TOKEN',
    'GITTER_INTEGRATION_REPO_FULL'
  );

  var FAKE_USER = {
    username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
    githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
  };

  it('return the state', function() {
    var underTest = new GitHubIssueStateService(FAKE_USER);

    return underTest.getIssueState(fixtureLoader.GITTER_INTEGRATION_REPO_FULL, 1).then(function(f) {
      assert.strictEqual(f, 'open');
    });
  });

  it('throw error for missing issue', function() {
    var underTest = new GitHubIssueStateService(FAKE_USER);

    return underTest
      .getIssueState(fixtureLoader.GITTER_INTEGRATION_REPO_FULL, 999999)
      .then(() => {
        assert.fail("Shouldn't be able to fetch missing issue");
      })
      .catch(err => {
        if (err instanceof assert.AssertionError) {
          throw err;
        }

        assert.strictEqual(err.status, 404);
      });
  });
});
