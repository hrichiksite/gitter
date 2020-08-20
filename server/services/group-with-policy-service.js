'use strict';

var assert = require('assert');
var StatusError = require('statuserror');
var ensureAccessAndFetchDescriptor = require('gitter-web-permissions/lib/ensure-access-and-fetch-descriptor');
var debug = require('debug')('gitter:app:group-with-policy-service');
var roomService = require('gitter-web-rooms');
var secureMethod = require('gitter-web-utils/lib/secure-method');
var validateRoomName = require('gitter-web-validators/lib/validate-room-name');
var validateProviders = require('gitter-web-validators/lib/validate-providers');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var groupService = require('gitter-web-groups/lib/group-service');

/**
 * @private
 */
function validateRoomSecurity(type, security) {
  if (type === 'GROUP' && security === 'INHERITED') {
    return true;
  }

  if (security === 'PUBLIC' || security === 'PRIVATE') {
    return true;
  }

  return false;
}

function allowAdmin() {
  return this.policy.canAdmin();
}

function GroupWithPolicyService(group, user, policy) {
  assert(group, 'Group required');
  assert(policy, 'Policy required');
  this.group = group;
  this.user = user;
  this.policy = policy;
}

/**
 * Allow admins to create a new room
 * @return {Promise} Promise of room
 */
GroupWithPolicyService.prototype.createRoom = secureMethod([allowAdmin], function(options) {
  assert(options, 'options required');
  var type = options.type || null;
  var providers = options.providers || [];
  var security = options.security;
  var name = options.name;
  var associateWithGitHubRepo = options.associateWithGitHubRepo;

  var user = this.user;
  var group = this.group;

  if (!validateProviders(providers)) {
    throw new StatusError(400, 'Invalid providers ' + providers);
  }

  assert(security, 'security required');

  if (!validateRoomSecurity(type, security)) {
    throw new StatusError(400, 'Invalid room security for ' + type + ': ' + security);
  }

  if (!validateRoomName(name)) {
    throw new StatusError(400, 'Invalid room name: ' + name);
  }

  return this._ensureAccessAndFetchRoomInfo(options)
    .spread(function(roomInfo, securityDescriptor) {
      debug('Upserting %j', roomInfo);

      return roomService.createGroupRoom(user, group, roomInfo, securityDescriptor, {
        tracking: options.tracking,
        associateWithGitHubRepo: associateWithGitHubRepo,
        addBadge: options.addBadge
      });
    })
    .then(function(results) {
      return {
        troupe: results.troupe,
        hookCreationFailedDueToMissingScope: results.hookCreationFailedDueToMissingScope
      };
    });
});

GroupWithPolicyService.prototype.setAvatar = secureMethod([allowAdmin], function(url) {
  groupService.setAvatarForGroup(this.group._id, url);
});

/**
 * @private
 */
GroupWithPolicyService.prototype._ensureAccessAndFetchRoomInfo = function(options) {
  var user = this.user;
  var group = this.group;
  var type = options.type || null;
  var providers = options.providers || [];
  var security = options.security;
  var topic = options.topic;
  var name = options.name;
  var linkPath = options.linkPath;
  var internalId;

  // This is probably not needed...
  var obtainAccessFromGitHubRepo = options.obtainAccessFromGitHubRepo;

  var uri = group.uri + '/' + name;

  if (!validateProviders(providers)) {
    throw new StatusError(400, 'Invalid providers ' + providers.toString());
  }

  assert(security, 'security required');

  if (!validateRoomSecurity(type, security)) {
    throw new StatusError(400, 'Invalid room security for ' + type + ': ' + security);
  }

  if (!validateRoomName(name)) {
    throw new StatusError(400, 'Invalid room name: ' + name);
  }

  if (type === 'GROUP') {
    internalId = group._id;
  }

  return troupeService.findByUri(uri).then(function(room) {
    if (room) {
      throw new StatusError(409, 'Room uri already taken: ' + uri);
    }

    return ensureAccessAndFetchDescriptor(user, {
      type: type,
      linkPath: linkPath,
      obtainAccessFromGitHubRepo: obtainAccessFromGitHubRepo,
      internalId: internalId,
      security: security
    }).then(function(securityDescriptor) {
      return [
        {
          topic: topic,
          uri: uri,
          providers: providers
        },
        securityDescriptor
      ];
    });
  });
};

GroupWithPolicyService.prototype.setAvatar = secureMethod([allowAdmin], function(url) {
  return groupService.setAvatarForGroup(this.group._id, url);
});

module.exports = GroupWithPolicyService;
