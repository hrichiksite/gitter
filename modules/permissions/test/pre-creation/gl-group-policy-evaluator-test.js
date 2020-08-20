'use strict';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const GitlabGroupPolicyEvaluator = require('../../lib/pre-creation/gl-group-policy-evaluator');

async function expect(user, uri, expected) {
  const evaluator = new GitlabGroupPolicyEvaluator(user, uri);

  assert.deepEqual(
    {
      canRead: await evaluator.canRead(),
      canWrite: await evaluator.canWrite(),
      canJoin: await evaluator.canJoin(),
      canAdmin: await evaluator.canAdmin(),
      canAddUser: await evaluator.canAddUser()
    },
    expected
  );
}

describe('gl-group-policy-evaluator #slow #gitlab', function() {
  fixtureLoader.ensureIntegrationEnvironment('#integrationGitlabUser1', 'GITLAB_GROUP1_URI');

  const fixture = fixtureLoader.setup({
    userGitlab1: '#integrationGitlabUser1',
    user2: {}
  });

  it('group members should have access', function() {
    return expect(fixture.userGitlab1, fixtureLoader.GITLAB_GROUP1_URI, {
      canRead: true,
      canWrite: true,
      canJoin: false,
      canAdmin: true,
      canAddUser: false
    });
  });

  it('non-group members should not have access ', function() {
    return expect(fixture.userGitlab1, 'gitlab-org/gitter', {
      canRead: false,
      canWrite: false,
      canJoin: false,
      canAdmin: false,
      canAddUser: false
    });
  });

  it('non-GitLab users should not have access ', function() {
    return expect(fixture.user2, fixtureLoader.GITLAB_GROUP1_URI, {
      canRead: false,
      canWrite: false,
      canJoin: false,
      canAdmin: false,
      canAddUser: false
    });
  });
});
