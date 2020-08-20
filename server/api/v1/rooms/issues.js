'use strict';

var Promise = require('bluebird');
var RepoService = require('gitter-web-github').GitHubRepoService;
var OrgService = require('gitter-web-github').GitHubOrgService;
var GitHubIssueService = require('gitter-web-github').GitHubIssueService;
var processText = require('gitter-web-text-processor');
var StatusError = require('statuserror');
var loadTroupeFromParam = require('./load-troupe-param');
var roomRepoService = require('gitter-web-rooms/lib/room-repo-service');

function getEightSuggestedIssues(issues, includeRepo) {
  var suggestedIssues = [];
  for (var i = issues.length - 1; i >= 0 && suggestedIssues.length < 8; i--) {
    var issue = issues[i];
    if (issue) {
      suggestedIssues.push(issue);
    }
  }

  return suggestedIssues.map(function(issue) {
    return {
      title: issue.title,
      number: includeRepo ? issue.repository.full_name + '#' + issue.number : issue.number
    };
  });
}

function getTopEightMatchingIssues(issues, term, includeRepo) {
  var matches = issues
    .filter(function(issue) {
      return issue && ('' + issue.number).indexOf(term) === 0;
    })
    .slice(0, 8)
    .map(function(issue) {
      return {
        title: issue.title,
        number: includeRepo ? issue.repository.full_name + '#' + issue.number : issue.number
      };
    });

  return matches;
}

module.exports = {
  id: 'issue',

  index: function(req) {
    var repoName = req.query.repoName;
    var issueNumber = req.query.issueNumber || '';

    return Promise.try(function() {
      if (repoName) {
        return {
          type: 'GH_REPO',
          linkPath: repoName
        };
      }

      // Resolve the repo name from the room
      return loadTroupeFromParam(req).then(function(troupe) {
        return roomRepoService.findAssociatedGithubObjectForRoom(troupe);
      });
    })
      .bind({
        includeRepo: false
      })
      .then(function(backingObject) {
        if (!backingObject) return;

        var type = backingObject.type;
        var linkPath = backingObject.linkPath;

        if (type === 'GH_REPO') {
          var repoService = new RepoService(req.user);

          return repoService.getIssues(linkPath, {
            firstPageOnly: !issueNumber
          });
        }

        if (type === 'GH_ORG') {
          var orgService = new OrgService(req.user);
          this.includeRepo = true;
          return orgService.getIssues(linkPath, {
            firstPageOnly: true // Only fetch the first page for org issues
          });
        }
      })
      .then(function(issues) {
        if (!issues) return [];

        var matches = issueNumber
          ? getTopEightMatchingIssues(issues, issueNumber, this.includeRepo)
          : getEightSuggestedIssues(issues, this.includeRepo);
        return matches;
      });
  },

  show: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        return roomRepoService.findAssociatedGithubRepoForRoom(troupe);
      })
      .then(function(repoUri) {
        if (!repoUri) throw new StatusError(404);

        var issueNumber = req.params.issue;

        var issueService = new GitHubIssueService(req.user);
        return issueService.getIssue(repoUri, issueNumber);
      })
      .then(function(issue) {
        if (req.query.renderMarkdown && issue.body) {
          return processText(issue.body).then(function(result) {
            issue.body_html = result.html;
            return issue;
          });
        }

        return issue;
      });
  }
};
