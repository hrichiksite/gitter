'use strict';

var GithubRepoService = require('./github-repo-service');
var GithubMeService = require('./github-me-service');
var GithubOrgService = require('./github-org-service');
var Promise = require('bluebird');

function getRepoMembers(uri, instigatingUser) {
  var repo = new GithubRepoService(instigatingUser);
  return repo.getCollaborators(uri).then(function(collaborators) {
    return collaborators.map(function(collaborator) {
      return collaborator.login;
    });
  });
}

function getOrgMembers(uri, instigatingUser) {
  var org = new GithubOrgService(instigatingUser);
  return org.members(uri).then(function(members) {
    return members.map(function(members) {
      return members.login;
    });
  });
}

module.exports.getMembers = Promise.method(function getMembers(uri, githubType, instigatingUser) {
  if (githubType === 'REPO') {
    return getRepoMembers(uri, instigatingUser);
  } else if (githubType === 'ORG') {
    return getOrgMembers(uri, instigatingUser);
  } else {
    throw new Error('unknown githubType "' + githubType + '"');
  }
});

module.exports.isMember = Promise.method(function isMember(
  username,
  uri,
  githubType,
  instigatingUser
) {
  if (githubType === 'REPO') {
    /* Is the user a collaborator on the repo? */
    var ghRepo = new GithubRepoService(instigatingUser);
    return ghRepo.isCollaborator(uri, username);
  } else if (githubType === 'ORG') {
    if (username === instigatingUser.username) {
      /* Is the current user a member of the org? */
      var ghMe = new GithubMeService(instigatingUser);
      return ghMe.isOrgMember(uri);
    } else {
      /* Is the specified user a member of the org? */
      var ghOrg = new GithubOrgService(instigatingUser);
      return ghOrg.member(uri, username);
    }
  } else {
    throw new Error('unknown githubType "' + githubType + '"');
  }
});
