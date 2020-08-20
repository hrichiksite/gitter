'use strict';

module.exports = {
  user: function(user) {
    if (!user) return undefined;
    return user.githubUserToken || user.githubToken;
  },
  full: function(user) {
    if (!user) return undefined;
    return user.githubToken || user.githubUserToken;
  }
};
