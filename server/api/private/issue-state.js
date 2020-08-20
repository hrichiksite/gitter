'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;
var GithubIssueStateService = require('gitter-web-github').GitHubIssueStateService;
var GitLabIssuableStateService = require('gitter-web-gitlab').GitLabIssuableStateService;
var StatusError = require('statuserror');

var EXPIRES_SECONDS = 180;
var EXPIRES_MILLISECONDS = EXPIRES_SECONDS * 1000;

function getIssueInfoFromQuery(query) {
  var type = query.t ? String(query.t) : 'issue';
  var provider = query.p ? String(query.p) : undefined;
  var repo = query.r ? String(query.r) : undefined;
  var iid = query.i ? String(query.i) : undefined;

  if (repo && iid) {
    return {
      type: type,
      provider: provider,
      repo: repo,
      iid: iid
    };
  }

  return null;
}

module.exports = function(req, res, next) {
  var issueQueryInfo = getIssueInfoFromQuery(req.query);

  if (!issueQueryInfo || !issueQueryInfo.repo || !issueQueryInfo.iid) {
    return next(new StatusError(400));
  }

  var getIssueStatePromise;
  if (issueQueryInfo.provider === 'gitlab') {
    var glService = new GitLabIssuableStateService(req.user, issueQueryInfo.type);
    getIssueStatePromise = glService.getIssueState(issueQueryInfo.repo, issueQueryInfo.iid);
  } else {
    var ghService = new GithubIssueStateService(req.user);
    getIssueStatePromise = ghService.getIssueState(issueQueryInfo.repo, issueQueryInfo.iid);
  }

  return getIssueStatePromise
    .then(function(results) {
      res.setHeader('Cache-Control', 'public, max-age=' + EXPIRES_SECONDS);
      res.setHeader('Expires', new Date(Date.now() + EXPIRES_MILLISECONDS).toUTCString());

      res.send([results]);
    })
    .catch(function(err) {
      stats.eventHF('issue.state.query.fail', 1, 1);

      logger.warn(
        'Unable to obtain issue state for ' +
          issueQueryInfo.provider +
          ' ' +
          issueQueryInfo.repo +
          '/' +
          issueQueryInfo.iid +
          ': ' +
          err,
        { exception: err }
      );
      throw err;
    })
    .catch(next);
};
