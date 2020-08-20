'use strict';

const assert = require('assert');
const proxyquireNoCallThru = require('proxyquire').noCallThru();

describe('gl-project-policy-delegate', () => {
  const PROJECT1_USER = { _id: 1, username: 'x_gitlab' };
  const NOT_PROJECT1_USER = { _id: 2, username: 'y_gitlab' };
  const NON_GITLAB_USER = { _id: 2, username: 'y' };
  const INVALID_USER = { _id: 3 };
  const USER_API_THROWS_ERROR = { _id: 666 };
  const PROJECT1 = 'group/project1';

  const FIXTURES = [
    {
      name: 'is project member',
      project: PROJECT1,
      user: PROJECT1_USER,
      policy: 'GL_PROJECT_MEMBER',
      expectedResult: true
    },
    {
      name: 'is not project member',
      project: PROJECT1,
      user: NOT_PROJECT1_USER,
      policy: 'GL_PROJECT_MEMBER',
      expectedResult: false
    },
    {
      name: 'is project maintainer',
      project: PROJECT1,
      user: PROJECT1_USER,
      policy: 'GL_PROJECT_MAINTAINER',
      expectedResult: true
    },
    {
      name: 'is not project maintainer',
      project: PROJECT1,
      user: NOT_PROJECT1_USER,
      policy: 'GL_PROJECT_MAINTAINER',
      expectedResult: false
    },
    {
      name: 'is not a GitLab user',
      project: PROJECT1,
      user: NON_GITLAB_USER,
      policy: 'GL_PROJECT_MEMBER',
      expectedResult: false
    },
    {
      name: 'anonymous',
      project: PROJECT1,
      user: null,
      policy: 'GL_PROJECT_MEMBER',
      expectedResult: false
    },
    {
      name: 'user sans username',
      project: PROJECT1,
      user: INVALID_USER,
      policy: 'GL_PROJECT_MEMBER',
      expectedResult: false
    },
    {
      name: 'invalid policy',
      project: PROJECT1,
      user: INVALID_USER,
      policy: 'INVALID',
      expectedResult: false
    },
    {
      name: 'API throws error',
      project: PROJECT1,
      user: USER_API_THROWS_ERROR,
      policy: 'INVALID',
      expectedResult: 'throw'
    }
  ];

  let GlProjectPolicyDelegate;
  function StubGitLabProjectService(user) {
    this.getMembership = async (uri, username) => {
      if (user === USER_API_THROWS_ERROR) {
        throw new Error('My fake StubGitLabProjectService error from USER_API_THROWS_ERROR');
      }

      if (uri === PROJECT1) {
        if (user === PROJECT1_USER && username === user.username) {
          return {
            accessLevel: 50,
            isMember: true,
            isMaintainer: true,
            isOwner: true
          };
        }
      }

      return {
        accessLevel: 0,
        isMember: false,
        isMaintainer: false,
        isOwner: false
      };
    };
  }

  function stubGetIdentityForUser(user, provider) {
    if ((provider === 'gitlab' && user === PROJECT1_USER) || user === NOT_PROJECT1_USER) {
      return { fakeProvider: true, providerKey: user.username };
    }

    return null;
  }

  before(() => {
    GlProjectPolicyDelegate = proxyquireNoCallThru(
      '../../lib/policies/gl-project-policy-delegate',
      {
        'gitter-web-gitlab': {
          GitLabProjectService: StubGitLabProjectService
        },
        'gitter-web-identity': {
          getIdentityForUser: stubGetIdentityForUser,
          GITLAB_IDENTITY_PROVIDER: 'gitlab'
        }
      }
    );
  });

  FIXTURES.forEach(meta => {
    it(meta.name, async () => {
      const securityDescriptor = {
        linkPath: meta.project
      };

      const user = meta.user;
      const userId = user && user._id;

      function userLoader() {
        return Promise.resolve(user);
      }

      const delegate = new GlProjectPolicyDelegate(userId, userLoader, securityDescriptor);

      try {
        const result = await delegate.hasPolicy(meta.policy);
        if (meta.expectedResult === 'throw') {
          assert.ok(false, 'Expected exception');
        }
        assert.strictEqual(result, meta.expectedResult);
      } catch (err) {
        if (meta.expectedResult !== 'throw') {
          throw err;
        }
      }
    });
  });
});
