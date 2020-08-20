'use strict';

var resolveUserAvatarUrl = require('gitter-web-shared/avatars/resolve-user-avatar-url');
var userService = require('gitter-web-users');

var DEFAULT_AVATAR_URL = 'https://avatars1.githubusercontent.com/u/0';

function resolveAvatarForUsername(req, res) {
  var username = req.params.username;
  var size = parseInt(req.query.s, 10) || 60;

  return userService.findByUsername(username).then(function(user) {
    var url;
    if (user) {
      url = resolveUserAvatarUrl(user, size);
      if (url.indexOf('/api/private/user-avatar/') !== -1) {
        // don't keep redirecting back here in a loop..
        url = DEFAULT_AVATAR_URL;
      }
    } else {
      url = DEFAULT_AVATAR_URL;
    }
    res.redirect(url);
  });
}

module.exports = resolveAvatarForUsername;
