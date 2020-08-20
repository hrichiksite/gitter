'use strict';

var wrap = require('./github-cache-wrapper');
var tentacles = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').user;

function GitHubUserService(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
}

GitHubUserService.prototype.getUser = function(user) {
  return tentacles.user.get(user, { accessToken: this.accessToken });
};

module.exports = wrap(GitHubUserService, function() {
  return [this.accessToken || ''];
});
