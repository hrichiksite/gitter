'use strict';

var RepoService = require('gitter-web-github').GitHubRepoService;
var StatusError = require('statuserror');

module.exports = function(req, res, next) {
  const type = req.query.type ? String(req.query.type) : null;
  const linkPath = req.query.linkPath ? String(req.query.linkPath) : null;

  if (type !== 'GH_REPO') return next(new StatusError(400, 'only GH_REPO type supported'));
  if (!linkPath) return next(new StatusError(400, 'repo parameter required'));
  const repoService = new RepoService(req.user);

  return repoService.getRepo(linkPath).then(function(repo) {
    if (!repo) return next(new StatusError(204, 'repo not found'));
    res.send(repo);
  }, next);
};
