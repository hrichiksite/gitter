/* global describe:true, it:true */
'use strict';

var assert = require('assert');
var GitHubFastSearch = require('..').GitHubFastSearch;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('github-fast-search #slow #github', function() {
  fixtureLoader.ensureIntegrationEnvironment(
    'GITTER_INTEGRATION_USERNAME',
    'GITTER_INTEGRATION_USER_SCOPE_TOKEN'
  );

  var FAKE_USER = {
    username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
    githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
  };

  it('should find suprememoocow', function(done) {
    var search = new GitHubFastSearch(FAKE_USER);

    search
      .findUsers('andrew newdigate')
      .then(function(results) {
        assert(Array.isArray(results));
        assert(results[0]);
      })
      .nodeify(done);
  });

  it('should not find more than one page of results', function(done) {
    var search = new GitHubFastSearch(FAKE_USER);

    search
      .findUsers('andrew')
      .then(function(results) {
        assert(Array.isArray(results));
        assert.strictEqual(results.length, 30);
        assert(results[0]);
      })
      .nodeify(done);
  });
});
