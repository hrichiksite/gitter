'use strict';

var Mirror = require('gitter-web-github').GitHubMirrorService('user');
var userService = require('gitter-web-users');
var StatusError = require('statuserror');

module.exports = function(req, res, next) {
  if (!req.params || !req.params[0]) return next(new StatusError(404));

  var githubUri = 'users/' + req.params[0];
  var mirror = new Mirror(req.user);

  mirror
    .get(githubUri)
    .then(function(body) {
      if (!body || !body.login) return res.send(body);

      return userService.findByUsername(body.login).then(function(user) {
        body.has_gitter_login = user ? true : undefined;

        if (user) {
          body.removed = user.isRemoved() ? true : undefined;
        }

        res.send(body);
      });
    })
    .catch(next);
};
