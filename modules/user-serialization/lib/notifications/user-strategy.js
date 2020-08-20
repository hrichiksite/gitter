'use strict';

var avatars = require('gitter-web-avatars');

function UserStrategy(/* options */) {
  this.preload = function() {};

  this.map = function(user) {
    if (!user) return null;

    var avatarUrl = avatars.getForUser(user);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatarUrl: avatarUrl,
      avatarUrlSmall: avatarUrl + '?s=60', // TODO: deprecate
      avatarUrlMedium: avatarUrl + '?s=128' // TODO: deprecate
    };
  };
}

UserStrategy.prototype = {
  name: 'UserStrategy'
};

module.exports = UserStrategy;
