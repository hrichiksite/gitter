'use strict';

var wrap = require('./github-cache-wrapper');
var tentacles = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').user;

var Search = function(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
};

Search.prototype.findUsers = function(searchString, callback) {
  return tentacles.search
    .users(searchString + ' type:user', {
      accessToken: this.accessToken,
      firstPageOnly: true,
      noRetry: true
    })
    .then(function(body) {
      return (body && body.items) || [];
    })
    .nodeify(callback);
};

module.exports = wrap(Search, function() {
  return [this.accessToken || ''];
});
