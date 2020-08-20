'use strict';

const assert = require('assert');
const proxyquireNoCallThru = require('proxyquire').noCallThru();
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('gitlab-user-service #flakey #slow #gitlab', function() {
  fixtureLoader.ensureIntegrationEnvironment('GITLAB_USER_TOKEN');

  const FAKE_USER = {
    username: 'FAKE_USER'
  };

  let oauthToken = null;
  let GitLabUserService;

  beforeEach(() => {
    GitLabUserService = proxyquireNoCallThru('../lib/user-service', {
      './get-gitlab-access-token-from-user': function() {
        return Promise.resolve(oauthToken);
      }
    });
  });

  afterEach(() => {
    oauthToken = null;
  });

  beforeEach(() => {
    oauthToken = fixtureLoader.GITLAB_USER_TOKEN;
  });

  it('should fetch user by GitLab user ID', async () => {
    const glGroupService = new GitLabUserService(FAKE_USER);
    const user = await glGroupService.getUserById(2619770);
    assert.strictEqual(user.username, 'gitter-integration-tests');
  });

  it('should fetch user by GitLab username', async () => {
    const glGroupService = new GitLabUserService(FAKE_USER);
    const user = await glGroupService.getUserByUsername('gitter-integration-tests');
    assert.strictEqual(user.username, 'gitter-integration-tests');
  });

  it('should throw error when unable to find user', async () => {
    const glGroupService = new GitLabUserService(FAKE_USER);

    try {
      await glGroupService.getUserByUsername('!!non-existant-user!!');
      assert.throws(
        'we expect an error to be thrown instead of an actual user from getUserByUsername'
      );
    } catch (err) {
      assert(err);
    }
  });
});
