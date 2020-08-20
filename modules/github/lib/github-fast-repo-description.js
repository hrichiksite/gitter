'use strict';

var RepoService = require('./github-repo-service');
var wrapper = require('gitter-web-cache-wrapper');
var config = require('gitter-web-env').config;

function getDescription(repoName) {
  var repoService = new RepoService();
  return repoService.getRepo(repoName).then(function(repo) {
    if (!repo) return null;
    return repo.description;
  });
}

module.exports = wrapper('github-fast-repo-description', getDescription, {
  ttl: config.get('github:fast-repo-description-cache-timeout')
});
