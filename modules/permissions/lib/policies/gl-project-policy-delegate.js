'use strict';

const debug = require('debug')('gitter:app:permissions:gl-project-policy-delegate');
const { GitLabProjectService } = require('gitter-web-gitlab');
const PolicyDelegateTransportError = require('./policy-delegate-transport-error');
const identityService = require('gitter-web-identity');
const PolicyDelegateBase = require('./policy-delegate-base');

class GlProjectPolicyDelegate extends PolicyDelegateBase {
  get securityDescriptorType() {
    return 'GL_PROJECT';
  }

  async hasPolicy(policyName) {
    if (!this._isValidUser()) {
      return false;
    }

    const membership = await this._checkMembership();
    if (!membership) {
      return false;
    }

    switch (policyName) {
      case 'GL_PROJECT_MEMBER':
        return membership.isMember;

      case 'GL_PROJECT_MAINTAINER':
        return membership.isMaintainer;

      default:
        debug(`Unknown permission ${policyName}, denying access`);
        return false;
    }
  }

  async _checkMembership() {
    const uri = this._securityDescriptor.linkPath;

    const user = await this._userLoader();
    const gitLabIdentity = await identityService.getIdentityForUser(
      user,
      identityService.GITLAB_IDENTITY_PROVIDER
    );

    if (!gitLabIdentity) {
      return null;
    }

    try {
      const glProjectService = new GitLabProjectService(user);
      return await glProjectService.getMembership(uri, gitLabIdentity.providerKey);
    } catch (err) {
      throw new PolicyDelegateTransportError(err.message);
    }
  }
}

module.exports = GlProjectPolicyDelegate;
