'use strict';

const debug = require('debug')('gitter:app:permissions:gl-user-policy-delegate');
const identityService = require('gitter-web-identity');
const PolicyDelegateBase = require('./policy-delegate-base');

class GlUserPolicyDelegate extends PolicyDelegateBase {
  get securityDescriptorType() {
    return 'GL_USER';
  }

  async hasPolicy(policyName) {
    if (!this._isValidUser()) {
      return false;
    }

    switch (policyName) {
      case 'GL_USER_SAME':
        return await this._checkIfusernameMatchesUri();

      default:
        debug(`Unknown permission ${policyName}, denying access`);
        return false;
    }
  }

  async _checkIfusernameMatchesUri() {
    const uri = this._securityDescriptor.linkPath;

    const user = await this._userLoader();
    const gitLabIdentity = await identityService.getIdentityForUser(
      user,
      identityService.GITLAB_IDENTITY_PROVIDER
    );
    if (!gitLabIdentity) return false;

    return uri.toLowerCase() === gitLabIdentity.username.toLowerCase();
  }
}

module.exports = GlUserPolicyDelegate;
