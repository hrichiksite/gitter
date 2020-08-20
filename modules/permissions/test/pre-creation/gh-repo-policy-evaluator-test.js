'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('gh-repo-policy-evaluator', function() {
  describe('#slow', function() {
    fixtureLoader.disableMongoTableScans();
    fixtureLoader.ensureIntegrationEnvironment('#integrationUser1');

    function expect(GitHubRepoPolicyEvaluator, user, uri, expected) {
      var evaluator = new GitHubRepoPolicyEvaluator(user, uri);
      return Promise.props({
        canRead: evaluator.canRead(),
        canWrite: evaluator.canWrite(),
        canJoin: evaluator.canJoin(),
        canAdmin: evaluator.canAdmin(),
        canAddUser: evaluator.canAddUser()
      })
        .then(function(access) {
          assert.deepEqual(access, expected);

          var evaluator = new GitHubRepoPolicyEvaluator(user, uri);
          return Promise.props({
            canRead: evaluator.canRead(),
            canWrite: evaluator.canWrite(),
            canJoin: evaluator.canJoin(),
            canAdmin: evaluator.canAdmin(),
            canAddUser: evaluator.canAddUser()
          });
        })
        .then(function(access) {
          assert.deepEqual(access, expected);
        });
    }

    describe('legacy group orgs', function() {
      var GitHubRepoPolicyEvaluator;
      before(function() {
        GitHubRepoPolicyEvaluator = require('../../lib/pre-creation/gh-repo-policy-evaluator');
      });

      var fixture = fixtureLoader.setup({
        deleteDocuments: {
          User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }]
        },
        user1: '#integrationUser1',
        user2: {},
        user3: {}
      });

      it('should deal with repo members', function() {
        var uri = fixtureLoader.GITTER_INTEGRATION_REPO_FULL;
        return expect(GitHubRepoPolicyEvaluator, fixture.user1, uri, {
          canRead: true,
          canWrite: true,
          canJoin: false,
          canAdmin: true,
          canAddUser: false
        });
      });

      it('should deal with non-org members ', function() {
        var uri = fixtureLoader.GITTER_INTEGRATION_REPO_FULL;

        return expect(GitHubRepoPolicyEvaluator, fixture.user2, uri, {
          canRead: false,
          canWrite: false,
          canJoin: false,
          canAdmin: false,
          canAddUser: false
        });
      });
    });
  });
});
