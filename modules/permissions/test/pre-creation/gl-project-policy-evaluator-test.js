'use strict';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const GitlabProjectPolicyEvaluator = require('../../lib/pre-creation/gl-project-policy-evaluator');

async function expect(user, uri, expected) {
  const evaluator = new GitlabProjectPolicyEvaluator(user, uri);

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

describe('gl-project-policy-evaluator #slow #gitlab', function() {
  fixtureLoader.ensureIntegrationEnvironment(
    '#integrationGitlabUser1',
    'GITLAB_PUBLIC_PROJECT1_URI'
  );

  const fixture = fixtureLoader.setup({
    userGitlab1: '#integrationGitlabUser1',
    user2: {}
  });

  it('project members should have access', function() {
    return expect(fixture.userGitlab1, fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI, {
      canRead: true,
      canWrite: true,
      canJoin: false,
      canAdmin: true,
      canAddUser: false
    });
  });

  it('non-project members should not have access ', function() {
    return expect(fixture.userGitlab1, 'gitlab-org/gitter/webapp', {
      canRead: false,
      canWrite: false,
      canJoin: false,
      canAdmin: false,
      canAddUser: false
    });
  });

  it('non-GitLab users should not have access ', function() {
    return expect(fixture.user2, fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI, {
      canRead: false,
      canWrite: false,
      canJoin: false,
      canAdmin: false,
      canAddUser: false
    });
  });
});
