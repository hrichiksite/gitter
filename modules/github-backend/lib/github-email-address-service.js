'use strict';

var Promise = require('bluebird');
var github = require('gitter-web-github');
var GitHubMeService = github.GitHubMeService;
var GitHubUserEmailAddressService = github.GitHubUserEmailAddressService;

function getPrivateEmailAddress(user) {
  var ghMe = new GitHubMeService(user);
  return ghMe.getEmail();
}

module.exports = Promise.method(function gitHubEmailAddressService(user, options) {
  if (user.githubUserToken || user.githubToken) {
    return getPrivateEmailAddress(user);
  }

  if (!options || !options.attemptDiscovery) return null;

  var githubUserEmailAddressService = new GitHubUserEmailAddressService(user);
  return githubUserEmailAddressService.findEmailAddressForGitHubUser(user.username);
});
