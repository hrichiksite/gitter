'use strict';

var assert = require('assert');
var GithubUserService = require('..').GitHubUserService;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('github-user-service #slow #github', function() {
  fixtureLoader.ensureIntegrationEnvironment(
    'GITTER_INTEGRATION_USERNAME',
    'GITTER_INTEGRATION_USER_SCOPE_TOKEN'
  );

  var FAKE_USER = {
    username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
    githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
  };

  it('getUser', function(done) {
    var gh = new GithubUserService(FAKE_USER);

    gh.getUser('suprememoocow')
      .then(function(user) {
        assert(user);
        assert.strictEqual(user.login, 'suprememoocow');
      })
      .nodeify(done);
  });
});
