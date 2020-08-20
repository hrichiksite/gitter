'use strict';

var debug = require('debug')('gitter:app:permissions:pre-creation:gh-repo-policy-evaluator');
var PolicyDelegateTransportError = require('../policies/policy-delegate-transport-error');
var GitHubRepoService = require('gitter-web-github').GitHubRepoService;
const PolicyEvaluatorBase = require('./policy-evaluator-base');

class GitHubRepoPolicyEvaluator extends PolicyEvaluatorBase {
  async _canAccess() {
    if (this._canAccessResult) {
      return this._canAccessResult;
    }

    debug('Fetching repo %s from github', this.uri);

    try {
      var repoService = new GitHubRepoService(this.user);
      this._canAccessResult = await repoService.getRepo(this.uri).then(function(repo) {
        if (!repo) return false;
        const perms = repo.permissions;
        const result = perms && (perms.push || perms.admin);
        return !!result;
      });

      return this._canAccessResult;
    } catch (err) {
      debug('Exeception while fetching repo');

      if ((err.errno && err.syscall) || err.statusCode >= 500) {
        // GitHub call failed and may be down.
        throw new PolicyDelegateTransportError(err.message);
      }

      throw err;
    }
  }
}

module.exports = GitHubRepoPolicyEvaluator;
