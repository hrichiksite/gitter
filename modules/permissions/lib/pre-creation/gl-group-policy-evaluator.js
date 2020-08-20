'use strict';

const debug = require('debug')('gitter:app:permissions:pre-creation:gl-group-policy-evaluator');
const PolicyDelegateTransportError = require('../policies/policy-delegate-transport-error');
const GitLabGroupService = require('gitter-web-gitlab').GitLabGroupService;
const identityService = require('gitter-web-identity');
const PolicyEvaluatorBase = require('./policy-evaluator-base');

class GitlabGroupPolicyEvaluator extends PolicyEvaluatorBase {
  async _canAccess() {
    if (this._canAccessResult !== null) {
      return this._canAccessResult;
    }

    if (!this.user || !this.user.username) return false;

    const gitLabIdentity = await identityService.getIdentityForUser(
      this.user,
      identityService.GITLAB_IDENTITY_PROVIDER
    );
    // Non GitLab users will never be an group member
    if (!gitLabIdentity) return false;

    const gitlabGroupService = new GitLabGroupService(this.user);
    try {
      const membership = await gitlabGroupService.getMembership(
        this.uri,
        gitLabIdentity.providerKey
      );
      this._canAccessResult = membership.isMaintainer;
      return this._canAccessResult;
    } catch (err) {
      debug('Exeception while fetching group');

      if ((err.errno && err.syscall) || err.statusCode >= 500) {
        // GitLab call failed and may be down.
        throw new PolicyDelegateTransportError(err.message);
      }

      throw err;
    }
  }
}

module.exports = GitlabGroupPolicyEvaluator;
