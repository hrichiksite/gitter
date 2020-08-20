'use strict';

var Promise = require('bluebird');
var uuid = require('uuid/v4');
var User = require('gitter-web-persistence').User;
var OAuthAccessToken = require('gitter-web-persistence').OAuthAccessToken;
var OAuthClient = require('gitter-web-persistence').OAuthClient;
var fixtureUtils = require('./fixture-utils');
var debug = require('debug')('gitter:tests:test-fixtures');
var integrationFixtures = require('./integration-fixtures');

var userCounter = 0;

function getIntegrationConfig(expected, fixtureName, f) {
  if (f === '#integrationUser1') {
    return {
      doc: {
        username: integrationFixtures.fixtures.GITTER_INTEGRATION_USERNAME,
        githubToken: integrationFixtures.fixtures.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
        accessToken: 'web-internal'
      },
      removeQuery: {
        username: integrationFixtures.fixtures.GITTER_INTEGRATION_USERNAME
      }
    };
  }

  if (f === '#integrationCollabUser1') {
    return {
      doc: {
        username: integrationFixtures.fixtures.GITTER_INTEGRATION_COLLAB_USERNAME,
        githubToken: integrationFixtures.fixtures.GITTER_INTEGRATION_COLLAB_USER_SCOPE_TOKEN,
        accessToken: 'web-internal'
      },
      removeQuery: {
        username: integrationFixtures.GITTER_INTEGRATION_COLLAB_USERNAME
      }
    };
  }
  if (f === '#integrationGitlabUser1') {
    // Push the backing identity that will be created down the line in `create-identities.js`
    expected[`identity${fixtureName}`] = {
      user: fixtureName,
      provider: 'gitlab',
      providerKey: integrationFixtures.fixtures.GITLAB_USER_ID,
      username: integrationFixtures.fixtures.GITLAB_USER_USERNAME,
      accessToken: integrationFixtures.fixtures.GITLAB_USER_TOKEN
    };

    const username = `${integrationFixtures.fixtures.GITLAB_USER_USERNAME}_gitlab`;
    return {
      doc: {
        username,
        accessToken: 'web-internal',
        githubId: undefined
      },
      removeQuery: {
        username
      }
    };
  }
}

function createUser(expected, fixtureName) {
  let f = expected[fixtureName];
  debug('Creating %s', fixtureName);

  var preremove = null;

  var integrationConfig = getIntegrationConfig(expected, fixtureName, f);
  if (integrationConfig) {
    f = integrationConfig.doc;
    if (integrationConfig.removeQuery) {
      preremove = function() {
        return User.remove(integrationConfig.removeQuery);
      };
    }
  }

  function possibleGenerate(key, fn) {
    if (f.hasOwnProperty(key)) {
      if (f[key] === true) {
        if (fn) {
          return fn();
        } else {
          return null;
        }
      } else {
        return f[key];
      }
    } else {
      if (fn) {
        return fn();
      } else {
        return null;
      }
    }
  }

  var doc = {
    identities: f.identities,
    displayName: possibleGenerate('displayName', fixtureUtils.generateName),
    githubId: possibleGenerate('githubId', fixtureUtils.generateGithubId),
    githubToken: possibleGenerate('githubToken'),
    username: possibleGenerate('username', fixtureUtils.generateUsername),
    gravatarImageUrl: f.gravatarImageUrl,
    state: f.state || undefined,
    staff: f.staff || false
  };

  if (f._id) {
    doc._id = f._id;
  }

  debug('Creating user %s with %j', fixtureName, doc);

  var promise = Promise.try(function() {
    if (preremove) {
      return preremove();
    }
  }).then(function() {
    return User.create(doc);
  });

  if (f.accessToken) {
    promise = promise.tap(function(user) {
      return OAuthClient.findOne({ clientKey: f.accessToken }).then(function(client) {
        if (!client) throw new Error('Client not found clientKey=' + f.accessToken);

        // We are using underscores so this this token passes the
        // `/api/v1/token/...` regex in `server/web/bayeux/authorisor.js`
        var token = '_test_' + uuid().replace(/-/g, '_');
        var doc = {
          token: token,
          userId: user._id,
          clientId: client._id,
          expires: new Date(Date.now() + 60 * 60 * 1000)
        };
        debug('Creating access token for %s with %j', fixtureName, doc);
        return OAuthAccessToken.create(doc).then(function() {
          user.accessToken = token;
        });
      });
    });
  }

  return promise;
}

function createExtraUsers(expected, fixture, key) {
  var obj = expected[key];
  var users = [];

  if (obj.user) {
    users.push(obj.user);
  }

  if (obj.users) {
    if (!Array.isArray(obj.users)) {
      obj.users = [obj.users];
    }

    users = users.concat(obj.users);
  }

  var extraMembers = obj.securityDescriptor && obj.securityDescriptor.extraMembers;
  if (extraMembers) {
    if (!Array.isArray(extraMembers)) {
      extraMembers = [extraMembers];
    }

    users = users.concat(extraMembers);
  }

  var extraAdmins = obj.securityDescriptor && obj.securityDescriptor.extraAdmins;
  if (extraAdmins) {
    if (!Array.isArray(extraAdmins)) {
      extraAdmins = [extraAdmins];
    }

    users = users.concat(extraAdmins);
  }

  return Promise.map(users, function(user, index) {
    if (typeof user === 'string') {
      if (expected[user]) return; // Already specified at the top level

      expected[user] = {};
      return createUser(expected, user).then(function(createdUser) {
        fixture[user] = createdUser;
      });
    }

    var fixtureName = 'user' + ++userCounter;
    obj.users[index] = fixtureName;
    expected[fixtureName] = user;

    debug('creating extra user %s', fixtureName);

    return createUser(expected, fixtureName).then(function(user) {
      fixture[fixtureName] = user;
    });
  }).then(function() {
    // now try and fill in the ones specified at the top level

    var obj = expected[key];
    var user = obj.user;

    if (!user) return;

    if (typeof user === 'string' && fixture[user]) {
      // Already specified at the top level, so copy it
      obj.user = fixture[user];
    }
  });
}

function createUsers(expected, fixture) {
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^user/)) {
      return createUser(expected, key).then(function(user) {
        fixture[key] = user;
      });
    }

    return null;
  }).then(function() {
    // only create the extra ones afterwards, otherwise we'll create
    // duplicate users before the ones above got saved and then they won't
    // link back to the same objects.
    return Promise.map(Object.keys(expected), function(key) {
      if (key.match(/^(troupe|group)/)) {
        return createExtraUsers(expected, fixture, key);
      }

      return null;
    });
  });
}

module.exports = createUsers;
