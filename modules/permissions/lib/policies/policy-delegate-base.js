'use strict';

const assert = require('assert');

class PolicyDelegateBase {
  constructor(userId, userLoader, securityDescriptor) {
    assert(userLoader, 'userLoader required');
    assert(securityDescriptor, 'securityDescriptor required');

    this._userId = userId;
    this._userLoader = userLoader;
    this._securityDescriptor = securityDescriptor;
  }

  get securityDescriptorType() {
    throw new Error('needs to be overriden in child class');
  }

  async hasPolicy(/*policyName*/) {
    throw new Error('needs to be overriden in child class');
  }

  getAccessDetails(policyName) {
    if (!this._isValidUser()) return;

    // No need to record access to a public room for a member joining because anyone can join anway
    // We still want to record access for admins through
    if (this._securityDescriptor.public && policyName === this._securityDescriptor.members) {
      return null;
    }

    const sd = this._securityDescriptor;
    return {
      type: this.securityDescriptorType,
      linkPath: sd.linkPath,
      externalId: sd.externalId
    };
  }

  getPolicyRateLimitKey(policyName) {
    if (!this._isValidUser()) return;
    const uri = this._securityDescriptor.linkPath;

    return this.securityDescriptorType + ':' + this._userId + ':' + uri + ':' + policyName;
  }

  _isValidUser() {
    return !!this._userId;
  }
}

module.exports = PolicyDelegateBase;
