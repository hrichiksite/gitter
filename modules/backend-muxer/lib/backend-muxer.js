'use strict';

var Promise = require('bluebird');
var userScopes = require('gitter-web-identity/lib/user-scopes');
var identityService = require('gitter-web-identity');

var registeredBackends = {
  google: require('gitter-web-google-backend'),
  github: require('gitter-web-github-backend'),
  gitlab: require('gitter-web-gitlab-backend'),
  twitter: require('gitter-web-twitter-backend'),
  linkedin: require('gitter-web-linkedin-backend')
  // ...
};

function resolveBackendForProvider(provider) {
  return registeredBackends[provider];
}

function resolveUserBackends(user) {
  var userBackends = [];

  return identityService
    .listForUser(user)
    .then(function(identities) {
      return identities.reduce(function(map, identity) {
        map[identity.provider] = identity;
        return map;
      }, {});
    })
    .then(function(identityMap) {
      if (user && userScopes.isGitHubUser(user)) {
        var Backend = resolveBackendForProvider('github');
        userBackends.push(new Backend(user, identityMap.github));
      }

      if (user && user.identities) {
        user.identities.forEach(function(identity) {
          var Backend = resolveBackendForProvider(identity.provider);
          userBackends.push(new Backend(user, identityMap[identity.provider]));
        });
      }

      return userBackends;
    });
}

function BackendMuxer(user) {
  this.user = user;
}

// Use this when each Backend returns an object or value and you just want them
// all as one array.
BackendMuxer.prototype.findResults = function(method, args) {
  args = args || [];

  return resolveUserBackends(this.user).then(function(userBackends) {
    return Promise.map(userBackends, function(backend) {
      return backend[method].apply(backend, args);
    });
  });
};

// Use this when each backend returns an array and you want to concatenate them
// all into one array.
BackendMuxer.prototype.findAllResults = function(method, args) {
  return this.findResults(method, args).then(function(arrays) {
    return Array.prototype.concat.apply([], arrays);
  });
};

function getFirstResultForBackends(method, args) {
  return function(backends) {
    if (!backends.length) return Promise.resolve();

    var i = 0;

    function tryNext() {
      if (i >= backends.length) return Promise.resolve();

      var nextBackend = backends[i];
      return Promise.resolve(nextBackend[method].apply(nextBackend, args)).then(function(result) {
        if (result) return result;

        i++;
        return tryNext();
      });
    }

    return tryNext();
  };
}

// Try the backends one by one and return the first one that returns a result's
// result.
BackendMuxer.prototype.getFirstResult = function(method, args) {
  return resolveUserBackends(this.user).then(getFirstResultForBackends(method, args || []));
};

BackendMuxer.prototype.getEmailAddress = function(preferStoredEmail) {
  return this.getFirstResult('getEmailAddress', [preferStoredEmail]);
};

BackendMuxer.prototype.findOrgs = function() {
  return this.findAllResults('findOrgs');
};

BackendMuxer.prototype.findProfiles = function() {
  return this.findResults('getProfile');
};

BackendMuxer.testOnly = {
  getFirstResultForBackends: getFirstResultForBackends,
  resolveUserBackends: resolveUserBackends
};

module.exports = BackendMuxer;
