'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('gh-user-policy-evaluator', function() {
  describe('#slow', function() {
    fixtureLoader.disableMongoTableScans();
    fixtureLoader.ensureIntegrationEnvironment('#integrationUser1');

    function expect(GhUserPolicyEvaluator, user, uri, expected) {
      var evaluator = new GhUserPolicyEvaluator(user, uri);
      return Promise.props({
        canRead: evaluator.canRead(),
        canWrite: evaluator.canWrite(),
        canJoin: evaluator.canJoin(),
        canAdmin: evaluator.canAdmin(),
        canAddUser: evaluator.canAddUser()
      })
        .then(function(access) {
          assert.deepEqual(access, expected);

          var evaluator = new GhUserPolicyEvaluator(user, uri);
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

    describe('precreate user orgs', function() {
      var fixture = fixtureLoader.setup({
        user1: '#integrationUser1',
        user2: {}
      });

      it('The owner should always have full access', function() {
        var GhUserPolicyEvaluator = require('../../lib/pre-creation/gh-user-policy-evaluator');
        var uri = fixtureLoader.GITTER_INTEGRATION_USERNAME;

        return expect(GhUserPolicyEvaluator, fixture.user1, uri, {
          canRead: true,
          canWrite: true,
          canJoin: false,
          canAdmin: true,
          canAddUser: false
        });
      });

      it('The owner should always have full access even when the case is mismatched', function() {
        var GhUserPolicyEvaluator = require('../../lib/pre-creation/gh-user-policy-evaluator');
        var uri = fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase();

        return expect(GhUserPolicyEvaluator, fixture.user1, uri, {
          canRead: true,
          canWrite: true,
          canJoin: false,
          canAdmin: true,
          canAddUser: false
        });
      });

      it('Other users should not get access', function() {
        var GhUserPolicyEvaluator = require('../../lib/pre-creation/gh-user-policy-evaluator');
        var uri = fixtureLoader.GITTER_INTEGRATION_USERNAME;

        return expect(GhUserPolicyEvaluator, fixture.user2, uri, {
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
