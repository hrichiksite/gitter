'use strict';

var User = require('gitter-web-persistence').User;
var isGitHubUsername = require('gitter-web-identity/lib/is-github-username');
var utils = require('./utils');

module.exports = function(username, size) {
  return User.findOne({ username: username }, { _id: 0, gravatarImageUrl: 1 }, { lean: true }).then(
    function(doc) {
      if (!doc || !doc.gravatarImageUrl) {
        // We don't know who this user is. Just fallback to GitHub for now
        return {
          url: 'https://avatars.githubusercontent.com/' + username + '?s=' + size,
          longTermCachable: true
        };
      }

      if (isGitHubUsername(username)) {
        return {
          url: utils.addSizeParam(doc.gravatarImageUrl, 's', size),
          longTermCachable: true
        };
      }

      // TODO: Deal with twitter users better (for example sizes etc)
      // Currently, twitter users will 404 if you add a ?s= to the url
      return {
        url: doc.gravatarImageUrl,
        longTermCachable: true
      };
    }
  );
};
