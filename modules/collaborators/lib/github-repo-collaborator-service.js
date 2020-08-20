'use strict';

var env = require('gitter-web-env');
var logger = env.logger.get('collaborators');
var Promise = require('bluebird');
var RepoService = require('gitter-web-github').GitHubRepoService;
var ContributorService = require('gitter-web-github').GitHubContributorService;
var _ = require('lodash');
var avatars = require('gitter-web-avatars');
var identityService = require('gitter-web-identity');

function deduplicate(collaborators) {
  var deduped = [];
  var logins = {};
  collaborators.forEach(function(collaborator) {
    if (!collaborator) return;
    if (logins[collaborator.login]) return;
    logins[collaborator.login] = 1;
    deduped.push(collaborator);
  });
  return deduped;
}

function withoutCurrentUser(users, user) {
  if (!users || !users.length) return [];

  return users.filter(function(u) {
    return u.login !== user.username;
  });
}

function allowFail(promise) {
  return promise.catch(function(e) {
    logger.error('collaborators service soft fail: ' + e.message, { exception: e });
    return null;
  });
}

function GitHubRepoCollaboratorService(user, repoUri) {
  this.user = user;
  this.repoUri = repoUri;
}

GitHubRepoCollaboratorService.prototype.findCollaborators = function() {
  var user = this.user;
  var ghRepo = new RepoService(user);
  var ghContributors = new ContributorService(user);

  return Promise.join(
    allowFail(ghContributors.getContributors(this.repoUri, { firstPageOnly: true })),
    allowFail(ghRepo.getCollaborators(this.repoUri, { firstPageOnly: true })),
    allowFail(ghRepo.getStargazers(this.repoUri, { firstPageOnly: true })),
    function(contributors, collaborators, stargazers) {
      var results = [];
      if (contributors) results = results.concat(contributors);
      if (collaborators) results = results.concat(collaborators);
      if (stargazers) results = results.concat(stargazers);

      var filtered = deduplicate(withoutCurrentUser(results, user));

      return _.map(filtered, function(member) {
        return {
          displayName: member.login,
          externalId: member.login,
          avatarUrl: avatars.getForGitHubUsername(member.login),
          type: identityService.GITHUB_IDENTITY_PROVIDER
        };
      });
    }
  );
};

module.exports = GitHubRepoCollaboratorService;
