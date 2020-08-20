'use strict';

var debug = require('debug')('gitter:app:permissions:pre-creation:gh-org-policy-evaluator');
var PolicyDelegateTransportError = require('../policies/policy-delegate-transport-error');
var GitHubOrgService = require('gitter-web-github').GitHubOrgService;
var isGitHubUser = require('gitter-web-identity/lib/is-github-user');
const PolicyEvaluatorBase = require('./policy-evaluator-base');

class GitHubOrgPolicyEvaluator extends PolicyEvaluatorBase {
  async _canAccess() {
    if (!this.user || !this.user.username) return false;

    // Non github users will never be an org member
    if (!isGitHubUser(this.user)) return false;

    if (this._canAccessResult) {
      return this._canAccessResult;
    }

    debug('Fetching org %s from github', this.uri);

    try {
      const ghOrg = new GitHubOrgService(this.user);
      this._canAccessResult = !!(await ghOrg.member(this.uri, this.user.username));
      return this._canAccessResult;
    } catch (err) {
      debug('Exeception while fetching org');

      if ((err.errno && err.syscall) || err.statusCode >= 500) {
        // GitHub call failed and may be down.
        throw new PolicyDelegateTransportError(err.message);
      }

      throw err;
    }
  }
}

module.exports = GitHubOrgPolicyEvaluator;
