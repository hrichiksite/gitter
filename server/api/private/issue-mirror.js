'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;
var StatusError = require('statuserror');
var GithubIssueService = require('gitter-web-github').GitHubIssueService;
var GitLabIssuableService = require('gitter-web-gitlab').GitLabIssuableService;
var processText = require('gitter-web-text-processor');
var util = require('util');
var highlight = require('highlight.js');

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

  var getIssueInfoFromQueryPromise;
  if (issueQueryInfo.provider === 'gitlab') {
    var glService = new GitLabIssuableService(req.user, issueQueryInfo.type);
    getIssueInfoFromQueryPromise = glService.getIssue(issueQueryInfo.repo, issueQueryInfo.iid);
  } else {
    var ghService = new GithubIssueService(req.user);
    getIssueInfoFromQueryPromise = ghService.getIssue(issueQueryInfo.repo, issueQueryInfo.iid);
  }

  return getIssueInfoFromQueryPromise
    .then(function(issueInfo) {
      res.setHeader('Cache-Control', 'public, max-age=' + EXPIRES_SECONDS);
      res.setHeader('Expires', new Date(Date.now() + EXPIRES_MILLISECONDS).toUTCString());

      if (req.query.renderMarkdown && issueInfo.body) {
        return processText(issueInfo.body).then(function(result) {
          issueInfo.bodyHtml = result.html;
          return issueInfo;
        });
      }

      // TODO: handle async processing of diffs
      if (
        req.query.renderPatchIfSingle &&
        issueInfo.files &&
        issueInfo.files.length === 1 &&
        issueInfo.files[0].patch
      ) {
        issueInfo.files[0].patch_html = util.format(
          '<pre><code>%s</code></pre>',
          highlight.highlight('diff', issueInfo.files[0].patch).value
        );
      }

      return issueInfo;
    })
    .then(function(issueInfo) {
      res.send(issueInfo);
    })
    .catch(function(e) {
      stats.eventHF('issue.state.query.fail', 1, 1);

      logger.warn(
        'Unable to obtain issue state for ' +
          issueQueryInfo.provider +
          ' ' +
          issueQueryInfo.repo +
          '/' +
          issueQueryInfo.iid +
          ': ' +
          e,
        { exception: e }
      );
      throw e;
    })
    .catch(next);
};
