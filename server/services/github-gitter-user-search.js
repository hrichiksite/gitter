'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var userSearchService = require('./user-search-service');
var userService = require('gitter-web-users');
var githubSearchService = require('gitter-web-github').GitHubFastSearch;
var extractGravatarVersion = require('gitter-web-avatars/server/extract-gravatar-version');
var Promise = require('bluebird');
var _ = require('lodash');

function cleanQuery(query) {
  query = query ? ('' + query).trim() : '';
  return query.replace(/\b(AND|OR)\b/i, "'$1'");
}

function searchGithubUsers(query, user, callback) {
  query = cleanQuery(query);
  var search = new githubSearchService(user);
  return search
    .findUsers(query)
    .then(function(users) {
      var results = users.map(function(user) {
        return {
          username: user.login,
          gravatarImageUrl: user.avatar_url,
          gravatarVersion: extractGravatarVersion(user.avatar_url)
        };
      });

      return results;
    })
    .catch(function(err) {
      logger.info('Github user search failed:' + err, { exception: err });
      return [];
    })
    .nodeify(callback);
}

function addGitterDataToGithubUsers(githubUsers) {
  var usernames = githubUsers.map(function(user) {
    return user.username;
  });

  return userService
    .githubUsersExists(usernames)
    .then(function(existsHash) {
      var gitterUsernames = Object.keys(existsHash).filter(function(username) {
        return !!existsHash[username];
      });

      return gitterUsernames;
    })
    .then(userService.findByUsernames)
    .then(function(gitterUsers) {
      var map = {};
      gitterUsers.forEach(function(user) {
        map[user.username] = user;
      });

      var augmentedGithubUsers = githubUsers.map(function(githubUser) {
        return map[githubUser.username] || githubUser;
      });

      return augmentedGithubUsers;
    });
}

module.exports = function(searchQuery, user, options, callback) {
  options = options || {};

  return Promise.all([
    userSearchService.searchForUsers(user.id, searchQuery, options),
    searchGithubUsers(searchQuery, user).then(addGitterDataToGithubUsers)
  ])
    .spread(function(gitterResults, githubUsers) {
      var gitterUsers = gitterResults.results;
      var excludedUsername = user.username;

      var merged = gitterUsers.concat(githubUsers);
      var noSelfMentions = merged.filter(function(user) {
        return user.username !== excludedUsername;
      });
      var deduplicated = _.uniq(noSelfMentions, function(user) {
        return user.username;
      });
      var limited = deduplicated.slice(0, options.limit);

      gitterResults.results = limited;
      return gitterResults;
    })
    .nodeify(callback);
};
