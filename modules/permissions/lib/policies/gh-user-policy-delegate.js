'use strict';

const isGitHubUser = require('gitter-web-identity/lib/is-github-user');
const PolicyDelegateBase = require('./policy-delegate-base');

class GhUserPolicyDelegate extends PolicyDelegateBase {
  get securityDescriptorType() {
    return 'GH_USER';
  }

  /**
   * Returns a key used to skip checks
   * We can skip because there is no API perf hit in this policy.
   * All of the checks are done locally
   */
  getPolicyRateLimitKey() {
    return null;
  }

  async hasPolicy(policyName) {
    if (!this._isValidUser()) {
      return false;
    }

    switch (policyName) {
      case 'GH_USER_SAME':
        return this._checkIfusernameMatchesUri();

      default:
        return false;
    }
  }

  // Does the username match
  async _checkIfusernameMatchesUri() {
    var linkPath = this._securityDescriptor.linkPath;
    if (!linkPath) return false;

    const user = await this._userLoader();
    if (!user) return false;
    if (!isGitHubUser(user)) return false;

    var currentUserName = user.username;
    if (!currentUserName) return false;

    return currentUserName.toLowerCase() === linkPath.toLowerCase();
  }
}

module.exports = GhUserPolicyDelegate;
