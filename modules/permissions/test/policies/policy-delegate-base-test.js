'use strict';

const assert = require('assert');
const PolicyDelegateBase = require('../../lib/policies/gh-repo-policy-delegate');

const USER = { _id: '1', username: 'some-username' };
async function userLoader() {
  return USER;
}

describe('policy-delegate-base', () => {
  it('should be able to get access details for admin policy in public room', () => {
    const securityDescriptor = {
      admins: 'GH_REPO_PUSH',
      members: 'PUBLIC',
      linkPath: 'some-repo',
      public: true
    };
    var delegate = new PolicyDelegateBase(USER._id, userLoader, securityDescriptor);

    assert(delegate.getAccessDetails('GH_REPO_PUSH'));
  });

  it('should be able to get access details for admin policy in private room', () => {
    const securityDescriptor = {
      admins: 'GH_REPO_PUSH',
      members: 'GH_REPO_ACCESS',
      linkPath: 'some-repo',
      public: false
    };
    var delegate = new PolicyDelegateBase(USER._id, userLoader, securityDescriptor);

    assert(delegate.getAccessDetails('GH_REPO_PUSH'));
  });

  it('no access details needed for member policy in public room', () => {
    const securityDescriptor = {
      admins: 'GH_REPO_PUSH',
      members: 'PUBLIC',
      linkPath: 'some-repo',
      public: true
    };
    var delegate = new PolicyDelegateBase(USER._id, userLoader, securityDescriptor);

    assert.strictEqual(delegate.getAccessDetails('PUBLIC'), null);
  });

  it('should be able to get access details for member policy in private room', () => {
    const securityDescriptor = {
      admins: 'GH_REPO_PUSH',
      members: 'GH_REPO_ACCESS',
      linkPath: 'some-repo',
      public: false
    };
    var delegate = new PolicyDelegateBase(USER._id, userLoader, securityDescriptor);

    assert(delegate.getAccessDetails('GH_REPO_PUSH'));
  });
});
