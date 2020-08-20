'use strict';

const GitHubOrgService = require('gitter-web-github').GitHubOrgService;
const PolicyDelegateTransportError = require('./policy-delegate-transport-error');
const isGitHubUser = require('gitter-web-identity/lib/is-github-user');
const PolicyDelegateBase = require('./policy-delegate-base');

class GhOrgPolicyDelegate extends PolicyDelegateBase {
  get securityDescriptorType() {
    return 'GH_ORG';
  }

  async hasPolicy(policyName) {
    if (policyName !== 'GH_ORG_MEMBER') {
      return false;
    }

    if (!this._isValidUser()) {
      return false;
    }

    return this._checkMembership();
  }

  async _checkMembership() {
    const user = await this._userLoader();

    if (!isGitHubUser(user)) return false;

    try {
      const ghOrg = new GitHubOrgService(user);
      const uri = this._securityDescriptor.linkPath;
      return await ghOrg.member(uri, user.username);
    } catch (err) {
      if ((err.errno && err.syscall) || err.statusCode >= 500) {
        // GitHub call failed and may be down.
        // We can fall back to whether the user is already in the room
        throw new PolicyDelegateTransportError(err.message);
      }

      throw err;
    }
  }
}

module.exports = GhOrgPolicyDelegate;
