'use strict';

var repoService = require('../repo-service');

module.exports = function watchedRepos(user) {
  return repoService.getReposForUser(user).then(function(ownedRepos) {
    return ownedRepos
      .filter(function(repo) {
        // dont suggest forks as when the urls are shortened in the client,
        // they look identical to the originals and people get angry

        return !repo.fork;
      })
      .map(function(repo) {
        return {
          uri: repo.full_name,
          githubRepo: repo,
          githubType: 'REPO',
          language: repo.language,
          is_owned_by_user: true
        };
      });
  });
};
