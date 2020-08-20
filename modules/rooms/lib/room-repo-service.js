'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var nconf = env.config;
var errorReporter = env.errorReporter;

var assert = require('assert');
var Promise = require('bluebird');
var request = require('request');
var badger = require('./badger-service');
var userSettingsService = require('gitter-web-user-settings');
var debug = require('debug')('gitter:app:room-repo-service');
var userScopes = require('gitter-web-identity/lib/user-scopes');
var securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor');

var badgerEnabled = nconf.get('autoPullRequest:enabled');

/**
 * Setup webhooks from a repo to a room
 */
var autoConfigureHooksForRoom = Promise.method(function(user, troupe, repoUri) {
  assert(user, 'user required');
  assert(troupe, 'troupe required');
  assert(repoUri, 'repoUri required');

  logger.info('Requesting autoconfigured integrations');

  return new Promise(function(resolve, reject) {
    request.post(
      {
        url: nconf.get('webhooks:basepath') + '/troupes/' + troupe.id + '/hooks',
        json: {
          service: 'github',
          endpoint: 'gitter',
          githubToken: user.githubToken || user.githubUserToken,
          autoconfigure: 1,
          repo: repoUri
        }
      },
      function(err, resp, body) {
        if (err) return reject(err);
        resolve(body);
      }
    );
  });
});

function associateRoomToRepo(room, user, options) {
  var addBadge = options.addBadge;
  var roomUri = room.uri;
  var repoUri = options.repoUri;
  assert(repoUri, 'repoUri required');
  assert(user, 'user required');

  debug('Executing associateRoomToRepo for %s', repoUri);

  /* Created here */
  /* TODO: Later we'll need to handle private repos too */
  var hasScope = userScopes.hasGitHubScope(user, 'public_repo');
  var hookCreationFailedDueToMissingScope;
  if (hasScope) {
    debug('User has public_repo scope. Will attempt to setup webhooks for this room');

    /* Do this asynchronously */
    autoConfigureHooksForRoom(user, room, repoUri).catch(function(err) {
      logger.error('Unable to apply hooks for new room', { exception: err });
      errorReporter(
        err,
        { uri: roomUri, repoUri: repoUri, user: user.username },
        { module: 'room-repo-service' }
      );
    });
  } else {
    debug('User lacks public_repo scope.');
    hookCreationFailedDueToMissingScope = true;
  }

  if (securityDescriptorUtils.isPublic(room) && addBadge) {
    /* Do this asynchronously (don't chain the promise) */
    userSettingsService
      .getUserSettings(user.id, 'badger_optout')
      .then(function(badgerOptOut) {
        // If the user has opted out never send the pull request
        if (badgerOptOut) {
          debug('User opted out of badger PRs: ' + user.id);
          return;
        }

        return sendBadgePullRequestForRepo(room, user, repoUri);
      })
      .catch(function(err) {
        logger.error('Unable to send pull request for new room', { exception: err });
        errorReporter(
          err,
          { roomUri: roomUri, repoUri: repoUri, user: user.username },
          { module: 'room-repo-service' }
        );
      });
  } else {
    debug(
      'Not adding a badger PR. Public %s, addBadge: %s',
      securityDescriptorUtils.isPublic(room),
      addBadge
    );
  }

  return {
    hookCreationFailedDueToMissingScope: hookCreationFailedDueToMissingScope
  };
}

var findAssociatedGithubRepoForRoom = Promise.method(function(room) {
  if (!room) return null;

  var linkPath = securityDescriptorUtils.getLinkPathIfType('GH_REPO', room);
  if (linkPath) return linkPath;

  if (!room.groupId) return null;

  return securityDescriptorService.group.findById(room.groupId, null).then(function(sd) {
    if (sd && sd.type === 'GH_REPO') return sd.linkPath;

    return null;
  });
});

var findAssociatedGithubObjectForRoom = Promise.method(function(room) {
  if (!room) return null;
  var sd = room.sd;
  if (!sd) return null;
  switch (sd.type) {
    case 'GH_REPO':
    case 'GH_ORG':
      return {
        type: sd.type,
        linkPath: sd.linkPath
      };
  }

  if (!room.groupId) return null;

  return securityDescriptorService.group.findById(room.groupId, null).then(function(sd) {
    switch (sd.type) {
      case 'GH_REPO':
      case 'GH_ORG':
        return {
          type: sd.type,
          linkPath: sd.linkPath
        };
    }

    return null;
  });
});

/**
 * Given an array of rooms, returns the repos associated with those
 * rooms, in a hash, keyed by the room.id
 */
function findAssociatedGithubRepoForRooms(rooms) {
  var result = {};
  var groupSet;
  if (!rooms || !rooms.length) return result;

  // Only one room? Use a singler, faster method
  if (rooms.length === 1) {
    var singleRoom = rooms[0];

    return findAssociatedGithubRepoForRoom(singleRoom).then(function(repoUri) {
      if (repoUri) {
        result[singleRoom.id || singleRoom._id] = repoUri;
      }
      return result;
    });
  }

  rooms.forEach(function(room) {
    var linkPath = securityDescriptorUtils.getLinkPathIfType('GH_REPO', room);
    var roomId = room.id || room._id;

    if (linkPath) {
      result[roomId] = linkPath;
      return;
    }

    var groupId = room.groupId;
    if (groupId) {
      if (!groupSet) {
        groupSet = {};
      }

      if (!groupSet[groupId]) {
        groupSet[groupId] = [];
      }

      groupSet[groupId].push(roomId);
    }
  });

  // If everything that we can resolve has been resolved, continue
  // no further...
  if (!groupSet) {
    return result;
  }

  // Lookup the security descriptors for the given groupIds
  var groupIds = Object.keys(groupSet);
  return securityDescriptorService.group
    .findByIdsSelect(groupIds, { type: 1, linkPath: 1 })
    .then(function(groups) {
      groups.forEach(function(group) {
        var groupId = group._id || group.id;

        var linkPath = securityDescriptorUtils.getLinkPathIfType('GH_REPO', group);

        if (linkPath) {
          var roomIds = groupSet[groupId];
          if (roomIds) {
            roomIds.forEach(function(roomId) {
              result[roomId] = linkPath;
            });
          }
        }
      });

      return result;
    });
}

function sendBadgePullRequestForRepo(room, user, repoUri) {
  assert(room, 'room required');
  assert(user, 'user required');
  assert(repoUri, 'repoUri required');

  var roomUri = room.uri;
  assert(roomUri, 'room must have a uri');

  debug('Sending a badger PR for repo=%s, uri=%s', repoUri, roomUri);

  // Badgers, Go!
  if (badgerEnabled) {
    return badger.sendBadgePullRequest(repoUri, roomUri, user);
  } else {
    debug(
      'Badger is disabled in this environment. Would have sent a badge request to repo %s for room %s',
      repoUri,
      roomUri
    );
  }
}

module.exports = {
  autoConfigureHooksForRoom: autoConfigureHooksForRoom,
  associateRoomToRepo: Promise.method(associateRoomToRepo),
  findAssociatedGithubRepoForRoom: findAssociatedGithubRepoForRoom,
  findAssociatedGithubRepoForRooms: Promise.method(findAssociatedGithubRepoForRooms),
  findAssociatedGithubObjectForRoom: findAssociatedGithubObjectForRoom,
  sendBadgePullRequestForRepo: Promise.method(sendBadgePullRequestForRepo)
};
