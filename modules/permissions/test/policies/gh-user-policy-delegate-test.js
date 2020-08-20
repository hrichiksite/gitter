'use strict';

const assert = require('assert');
const proxyquireNoCallThru = require('proxyquire').noCallThru();

describe('gh-user-policy-delegate', () => {
  const SAME_USER = { _id: 1, username: 'x', githubId: 123 };
  const NOT_SAME_USER = { _id: 2, username: 'y', githubId: 456 };
  const NON_GITHUB_USER = { _id: 2, username: 'y_twitter' };
  const INVALID_USER = { _id: 3 };
  const USERNAME1 = 'x';

  const FIXTURES = [
    {
      name: 'is same user',
      linkPath: USERNAME1,
      user: SAME_USER,
      policy: 'GH_USER_SAME',
      expectedResult: true
    },
    {
      name: 'is not same user',
      linkPath: USERNAME1,
      user: NOT_SAME_USER,
      policy: 'GH_USER_SAME',
      expectedResult: false
    },
    {
      name: 'is not a GitLab user',
      linkPath: USERNAME1,
      user: NON_GITHUB_USER,
      policy: 'GH_USER_SAME',
      expectedResult: false
    },
    {
      name: 'anonymous',
      linkPath: USERNAME1,
      user: null,
      policy: 'GH_USER_SAME',
      expectedResult: false
    },
    {
      name: 'user sans username',
      linkPath: USERNAME1,
      user: INVALID_USER,
      policy: 'GH_USER_SAME',
      expectedResult: false
    },
    {
      name: 'invalid policy',
      linkPath: USERNAME1,
      user: INVALID_USER,
      policy: 'INVALID',
      expectedResult: false
    }
  ];

  let GhUserPolicyDelegate;
  before(() => {
    GhUserPolicyDelegate = proxyquireNoCallThru('../../lib/policies/gh-user-policy-delegate', {
      // ...
    });
  });

  FIXTURES.forEach(meta => {
    it(meta.name, async () => {
      const securityDescriptor = {
        linkPath: meta.linkPath
      };

      const user = meta.user;
      const userId = user && user._id;

      function userLoader() {
        return Promise.resolve(user);
      }

      const delegate = new GhUserPolicyDelegate(userId, userLoader, securityDescriptor);

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
