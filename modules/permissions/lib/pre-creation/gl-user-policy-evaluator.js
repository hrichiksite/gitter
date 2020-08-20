'use strict';

const identityService = require('gitter-web-identity');
const PolicyEvaluatorBase = require('./policy-evaluator-base');

class GitlabUserPolicyEvaluator extends PolicyEvaluatorBase {
  async _canAccess() {
    if (this._canAccessResult !== null) {
      return this._canAccessResult;
    }

    if (!this.user || !this.user.username) return false;

    const gitLabIdentity = await identityService.getIdentityForUser(this.user, 'gitlab');
    if (!gitLabIdentity) return false;

    this._canAccessResult = this.uri.toLowerCase() === gitLabIdentity.username.toLowerCase();
    return this._canAccessResult;
  }
}

module.exports = GitlabUserPolicyEvaluator;
