'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('legacy-group-policy-evaluator', function() {
  describe('#slow', function() {
    fixtureLoader.disableMongoTableScans();
    fixtureLoader.ensureIntegrationEnvironment('GITTER_INTEGRATION_ORG');

    function expect(GithubOrgPolicyEvaluator, user, uri, expected) {
      var evaluator = new GithubOrgPolicyEvaluator(user, uri);
      return Promise.props({
        canRead: evaluator.canRead(),
        canWrite: evaluator.canWrite(),
        canJoin: evaluator.canJoin(),
        canAdmin: evaluator.canAdmin(),
        canAddUser: evaluator.canAddUser()
      })
        .then(function(access) {
          assert.deepEqual(access, expected);

          var evaluator = new GithubOrgPolicyEvaluator(user, uri);
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
      var GithubOrgPolicyEvaluator;
      before(function() {
        GithubOrgPolicyEvaluator = require('../../lib/pre-creation/gh-org-policy-evaluator');
      });

      var fixture = fixtureLoader.setup({
        user1: '#integrationUser1',
        user2: {},
        user3: {}
      });

      it('should deal with org members', function() {
        var uri = fixtureLoader.GITTER_INTEGRATION_ORG;
        return expect(GithubOrgPolicyEvaluator, fixture.user1, uri, {
          canRead: true,
          canWrite: true,
          canJoin: false,
          canAdmin: true,
          canAddUser: false
        });
      });

      it('should deal with non-org members ', function() {
        var uri = fixtureLoader.GITTER_INTEGRATION_ORG;

        return expect(GithubOrgPolicyEvaluator, fixture.user2, uri, {
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
