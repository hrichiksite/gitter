'use strict';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const GitlabUserPolicyEvaluator = require('../../lib/pre-creation/gl-user-policy-evaluator');

async function expect(user, uri, expected) {
  const evaluator = new GitlabUserPolicyEvaluator(user, uri);

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

describe('gl-user-policy-evaluator #slow #gitlab', function() {
  fixtureLoader.ensureIntegrationEnvironment('#integrationGitlabUser1');

  const fixture = fixtureLoader.setup({
    userGitlab1: '#integrationGitlabUser1',
    user2: {}
  });

  it('same GitLab user should have access', function() {
    return expect(fixture.userGitlab1, fixture.userGitlab1.username.replace(/_gitlab$/, ''), {
      canRead: true,
      canWrite: true,
      canJoin: false,
      canAdmin: true,
      canAddUser: false
    });
  });

  it('different GitLab user should not have access', function() {
    return expect(fixture.userGitlab1, 'some-other-user', {
      canRead: false,
      canWrite: false,
      canJoin: false,
      canAdmin: false,
      canAddUser: false
    });
  });

  it('non-GitLab users should not have access even if username matches', function() {
    return expect(fixture.user2, fixture.user2.username, {
      canRead: false,
      canWrite: false,
      canJoin: false,
      canAdmin: false,
      canAddUser: false
    });
  });
});
