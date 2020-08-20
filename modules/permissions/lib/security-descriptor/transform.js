'use strict';

var StatusError = require('statuserror');
var Group = require('gitter-web-persistence').Group;
var Promise = require('bluebird');

function transformToGroup(sd, groupId) {
  var isPublic = sd.public;
  var members;

  if (isPublic) {
    members = 'PUBLIC';
  } else {
    members = 'INVITE_OR_ADMIN';
  }

  return {
    type: 'GROUP',
    members: members,
    admins: 'GROUP_ADMIN',
    public: isPublic,
    linkPath: null,
    internalId: groupId,
    externalId: null,
    extraAdmins: sd.extraAdmins || [],
    extraMembers: sd.extraMembers || []
  };
}

function transformToUnbacked(sd) {
  var isPublic = sd.public;
  var members;

  if (isPublic) {
    members = 'PUBLIC';
  } else {
    members = 'INVITE_OR_ADMIN';
  }

  return {
    type: null,
    members: members,
    admins: 'MANUAL',
    public: isPublic,
    linkPath: null,
    internalId: null,
    externalId: null,
    extraAdmins: sd.extraAdmins || [],
    extraMembers: sd.extraMembers || []
  };
}

function validateTransformation(Model, sd, newType, groupId) {
  // Trying to get a group backed by a group
  if (Model === Group && newType === 'GROUP') {
    throw new StatusError(400, 'Groups cannot be backed by groups');
  }

  if (newType === 'GROUP' && !groupId) {
    throw new StatusError(400, 'groupId required');
  }
}

// Migrate a security descritpor to another type
// You can currently only go from a backed(GitHub, GitLab) group/room to a unbacked(null, Group) group/room
//
// eslint-disable-next-line complexity
function transform(Model, sd, newType, options) {
  var groupId = options && options.groupId;
  // Idempotent?
  if (sd.type === newType) {
    return sd;
  }

  validateTransformation(Model, sd, newType, groupId);

  switch (sd.type) {
    case 'ONE_TO_ONE':
      // Never allow changing ONE_TO_ONE
      break;

    case null:
      // Unbacked can only become groups right now...
      if (newType !== 'GROUP') break;
      return transformToGroup(sd, groupId);

    case 'GL_GROUP':
    case 'GL_PROJECT':
    case 'GL_USER':
    case 'GH_ORG':
    case 'GH_REPO':
    case 'GH_USER':
      switch (newType) {
        case null:
          return transformToUnbacked(sd);
        case 'GROUP':
          return transformToGroup(sd, groupId);
      }
      break;

    case 'GROUP':
      // Groups can only become unbacked right now...
      if (newType !== null) break;

      return transformToUnbacked(sd);
  }

  throw new StatusError(400, 'Cannot transform from ' + sd.type + ' to ' + newType);
}

module.exports = Promise.method(transform);
