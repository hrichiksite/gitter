'use strict';

const assert = require('assert');
const proxyquireNoCallThru = require('proxyquire').noCallThru();

describe('gl-group-policy-delegate', () => {
  const GROUP1_USER = { _id: 1, username: 'x_gitlab' };
  const NOT_GROUP1_USER = { _id: 2, username: 'y_gitlab' };
  const NON_GITLAB_USER = { _id: 2, username: 'y' };
  const INVALID_USER = { _id: 3 };
  const USER_API_THROWS_ERROR = { _id: 666 };
  const GROUP1 = 'group1';

  const FIXTURES = [
    {
      name: 'is group member',
      group: GROUP1,
      user: GROUP1_USER,
      policy: 'GL_GROUP_MEMBER',
      expectedResult: true
    },
    {
      name: 'is not group member',
      group: GROUP1,
      user: NOT_GROUP1_USER,
      policy: 'GL_GROUP_MEMBER',
      expectedResult: false
    },
    {
      name: 'is group maintainer',
      group: GROUP1,
      user: GROUP1_USER,
      policy: 'GL_GROUP_MAINTAINER',
      expectedResult: true
    },
    {
      name: 'is not group maintainer',
      group: GROUP1,
      user: NOT_GROUP1_USER,
      policy: 'GL_GROUP_MAINTAINER',
      expectedResult: false
    },
    {
      name: 'is not a GitLab user',
      group: GROUP1,
      user: NON_GITLAB_USER,
      policy: 'GL_GROUP_MEMBER',
      expectedResult: false
    },
    {
      name: 'anonymous',
      group: GROUP1,
      user: null,
      policy: 'GL_GROUP_MEMBER',
      expectedResult: false
    },
    {
      name: 'user sans username',
      group: GROUP1,
      user: INVALID_USER,
      policy: 'GL_GROUP_MEMBER',
      expectedResult: false
    },
    {
      name: 'invalid policy',
      group: GROUP1,
      user: INVALID_USER,
      policy: 'INVALID',
      expectedResult: false
    },
    {
      name: 'API throws error',
      group: GROUP1,
      user: USER_API_THROWS_ERROR,
      policy: 'INVALID',
      expectedResult: 'throw'
    }
  ];

  let GlGroupPolicyDelegate;
  function StubGitLabGroupService(user) {
    this.getMembership = async (uri, username) => {
      if (user === USER_API_THROWS_ERROR) {
        throw new Error('My fake StubGitLabGroupService error from USER_API_THROWS_ERROR');
      }

      if (uri === GROUP1) {
        if (user === GROUP1_USER && username === user.username) {
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
    if ((provider === 'gitlab' && user === GROUP1_USER) || user === NOT_GROUP1_USER) {
      return { fakeProvider: true, providerKey: user.username };
    }

    return null;
  }

  before(() => {
    GlGroupPolicyDelegate = proxyquireNoCallThru('../../lib/policies/gl-group-policy-delegate', {
      'gitter-web-gitlab': {
        GitLabGroupService: StubGitLabGroupService
      },
      'gitter-web-identity': {
        getIdentityForUser: stubGetIdentityForUser,
        GITLAB_IDENTITY_PROVIDER: 'gitlab'
      }
    });
  });

  FIXTURES.forEach(meta => {
    it(meta.name, async () => {
      const securityDescriptor = {
        linkPath: meta.group
      };

      const user = meta.user;
      const userId = user && user._id;

      function userLoader() {
        return Promise.resolve(user);
      }

      const delegate = new GlGroupPolicyDelegate(userId, userLoader, securityDescriptor);

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
