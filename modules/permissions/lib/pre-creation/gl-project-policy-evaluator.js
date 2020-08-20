'use strict';

const debug = require('debug')('gitter:app:permissions:pre-creation:gl-project-policy-evaluator');
const PolicyDelegateTransportError = require('../policies/policy-delegate-transport-error');
const GitLabProjectService = require('gitter-web-gitlab').GitLabProjectService;
const identityService = require('gitter-web-identity');
const PolicyEvaluatorBase = require('./policy-evaluator-base');

class GitlabProjectPolicyEvaluator extends PolicyEvaluatorBase {
  async _canAccess() {
    if (this._canAccessResult !== null) {
      return this._canAccessResult;
    }

    if (!this.user || !this.user.username) return false;

    const gitLabIdentity = await identityService.getIdentityForUser(this.user, 'gitlab');
    // Non GitLab users will never be an project member
    if (!gitLabIdentity) return false;

    const gitlabProjectService = new GitLabProjectService(this.user);
    try {
      const membership = await gitlabProjectService.getMembership(
        this.uri,
        gitLabIdentity.providerKey
      );
      this._canAccessResult = membership.isMaintainer;
      return this._canAccessResult;
    } catch (err) {
      debug('Exeception while fetching project');

      if ((err.errno && err.syscall) || err.statusCode >= 500) {
        // GitLab call failed and may be down.
        throw new PolicyDelegateTransportError(err.message);
      }

      throw err;
    }
  }
}

module.exports = GitlabProjectPolicyEvaluator;
