'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var Mirror = require('gitter-web-github').GitHubMirrorService('user');
var userService = require('gitter-web-users');
var url = require('url');
var StatusError = require('statuserror');

module.exports = function(req, res, next) {
  if (!req.user) return next(new StatusError(401));

  var githubUri = url.format({ pathname: 'search/users', query: req.query });

  var mirror = new Mirror(req.user);

  mirror
    .get(githubUri)
    .then(function(body) {
      if (!body || !body.items || !body.items.length) return res.send(body);

      var logins = body.items.map(function(i) {
        return i.login;
      });

      return userService
        .githubUsersExists(logins)
        .then(function(exists) {
          body.items.forEach(function(item) {
            item.has_gitter_login = exists[item.login];
          });

          return res.send(body);
        })
        .catch(function(err) {
          winston.error('githubUsersExists failed' + err, { exception: err });
          res.send(body);
        });
    })
    .catch(next);
};
