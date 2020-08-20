'use strict';

var Promise = require('bluebird');
var OrgService = require('gitter-web-github').GitHubOrgService;
var MeService = require('gitter-web-github').GitHubMeService;
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

function GitHubUserCollaboratorService(user) {
  this.user = user;
}

GitHubUserCollaboratorService.prototype.findCollaborators = function() {
  var user = this.user;

  return Promise.join(this.findOrgCollaborators(), this.findUserFollowers(), function(
    followers,
    orgsMembers
  ) {
    var results = [];
    if (followers) results = results.concat(followers);
    if (orgsMembers) results = results.concat(orgsMembers);

    var filtered = withoutCurrentUser(results, user);
    filtered = deduplicate(filtered);
    return _.map(filtered, function(member) {
      return {
        displayName: member.login,
        externalId: member.login,
        avatarUrl: avatars.getForGitHubUsername(member.login),
        type: identityService.GITHUB_IDENTITY_PROVIDER
      };
    });
  });
};

GitHubUserCollaboratorService.prototype.findOrgCollaborators = function() {
  var user = this.user;

  var ghOrg = new OrgService(user);
  var ghMe = new MeService(user);

  return ghMe
    .getOrgs()
    .then(function(orgs) {
      return Promise.map(orgs || [], function(org) {
        return ghOrg.someMembers(org.login, { firstPageOnly: true }).reflect();
      });
    })
    .then(function(results) {
      return results
        .filter(function(inspection) {
          return inspection.isFulfilled();
        })
        .reduce(function(memo, inspection) {
          var members = inspection.value();
          if (members) {
            memo = memo.concat();
          }
          return memo;
        }, []);
    });
};

GitHubUserCollaboratorService.prototype.findUserFollowers = function() {
  var ghMe = new MeService(this.user);

  return ghMe.getFollowers({ firstPageOnly: true });
};

module.exports = GitHubUserCollaboratorService;
