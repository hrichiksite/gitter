'use strict';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const proxyquireNoCallThru = require('proxyquire').noCallThru();

describe('gitlab-uri-validator #slow #gitlab', function() {
  const fixture = fixtureLoader.setup({
    user1: {}
  });

  let validateGitlabUri;
  let getUserByUsernameStub;
  let getGroupStub;
  let getProjectStub;
  beforeEach(() => {
    getUserByUsernameStub = null;
    getGroupStub = null;
    getProjectStub = null;
    validateGitlabUri = proxyquireNoCallThru('../lib/gitlab-uri-validator', {
      './user-service': function() {
        return {
          getUserByUsername: getUserByUsernameStub
        };
      },
      './group-service': function() {
        return {
          getGroup: getGroupStub
        };
      },
      './project-service': function() {
        return {
          getProject: getProjectStub
        };
      }
    });
  });

  it('validate real group', async () => {
    getGroupStub = () => {
      return {
        backend: 'gitlab',
        id: 1540914,
        name: 'GitLab.org / gitter',
        avatar_url:
          'https://assets.gitlab-static.net/uploads/-/system/group/avatar/1540914/icon_128x128.png',
        uri: 'gitlab-org/gitter',
        absoluteUri: 'https://gitlab.com/groups/gitlab-org/gitter'
      };
    };

    const gitlabInfo = await validateGitlabUri(fixture.user1, 'gitlab-org/gitter');
    assert(gitlabInfo);
    assert.strictEqual(gitlabInfo.type, 'GROUP');
    assert.strictEqual(gitlabInfo.uri, 'gitlab-org/gitter');
    assert.strictEqual(gitlabInfo.externalId, 1540914);
  });

  it('validate real project', async () => {
    getProjectStub = () => {
      return {
        backend: 'gitlab',
        id: 7616684,
        name: 'public-project1',
        description: '',
        absoluteUri: 'https://gitlab.com/gitter-integration-tests-group/public-project1',
        uri: 'gitter-integration-tests-group/public-project1',
        private: false,
        avatar_url: null
      };
    };

    const gitlabInfo = await validateGitlabUri(fixture.user1, 'gitlab-org/gitter/webapp');
    assert(gitlabInfo);
    assert.strictEqual(gitlabInfo.type, 'PROJECT');
    assert.strictEqual(gitlabInfo.uri, 'gitter-integration-tests-group/public-project1');
    assert.strictEqual(gitlabInfo.externalId, 7616684);
  });

  it('validate real user', async () => {
    getUserByUsernameStub = () => {
      return {
        id: 1577466,
        name: 'Gitter Badger',
        username: 'gitter-badger',
        state: 'active',
        avatar_url:
          'https://assets.gitlab-static.net/uploads/-/system/user/avatar/1577466/avatar.png',
        web_url: 'https://gitlab.com/gitter-badger'
      };
    };

    const gitlabInfo = await validateGitlabUri(fixture.user1, 'gitter-badger');
    assert.deepEqual(gitlabInfo, {
      description: 'Gitter Badger',
      externalId: 1577466,
      type: 'USER',
      uri: 'gitter-badger'
    });
  });

  it('validate nonexistant group does not throw', async () => {
    getGroupStub = () => {
      const err = new Error('Fake HTTPError: Not Found');
      err.response = {
        status: 404
      };
    };

    const gitlabInfo = await validateGitlabUri(fixture.user1, 'foo-foo-does-not-exist');
    assert.strictEqual(gitlabInfo, null);
  });

  it('validate nonexistant project does not throw', async () => {
    getProjectStub = () => {
      const err = new Error('Fake HTTPError: Not Found');
      err.response = {
        status: 404
      };
    };

    const gitlabInfo = await validateGitlabUri(
      fixture.user1,
      'foo-foo-does-not-exist/bar-bar-what-up'
    );
    assert.strictEqual(gitlabInfo, null);
  });

  it('Connection problem to GitLab will throw', async () => {
    getGroupStub = () => {
      const err = new Error('Fake HTTPError: Not Found');
      err.response = {
        status: 500
      };
    };

    const gitlabInfo = await validateGitlabUri(fixture.user1, 'foo-foo-does-not-exist');
    assert.strictEqual(gitlabInfo, null);
  });

  it('Permission problem to GitLab will throw', async () => {
    getGroupStub = () => {
      const err = new Error('Fake HTTPError: Not Found');
      err.response = {
        status: 403
      };
    };

    const gitlabInfo = await validateGitlabUri(fixture.user1, 'foo-foo-does-not-exist');
    assert.strictEqual(gitlabInfo, null);
  });
});
