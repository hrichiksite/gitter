'use strict';

var StatusError = require('statuserror');
var assert = require('assert');

function usernameMatchesUri(user, linkPath) {
  if (!user) return false;
  var currentUserName = user.username;
  if (!currentUserName) return false;

  if (!linkPath) return false;

  return currentUserName.toLowerCase() === linkPath.toLowerCase();
}

function generateGhUserSecurityDescriptor(user, options) {
  var externalId = options.externalId;
  var linkPath = options.linkPath;
  var security = options.security;

  assert(linkPath, 'linkPath required');

  var extraAdmins;
  if (!user || usernameMatchesUri(user, linkPath)) {
    extraAdmins = [];
  } else {
    extraAdmins = [user._id];
  }

  switch (security || null) {
    case 'PUBLIC':
    case null:
      return {
        type: 'GH_USER',
        members: 'PUBLIC',
        admins: 'GH_USER_SAME',
        public: true,
        linkPath: linkPath,
        externalId: externalId,
        extraAdmins: extraAdmins
      };

    case 'PRIVATE':
      return {
        type: 'GH_USER',
        members: 'INVITE',
        admins: 'GH_USER_SAME',
        public: false,
        linkPath: linkPath,
        externalId: externalId,
        extraAdmins: extraAdmins
      };

    default:
      throw new StatusError(500, 'Unknown security type: ' + security);
  }
}

function generateGhOrgSecurityDescriptor(user, options) {
  var externalId = options.externalId;
  var linkPath = options.linkPath;
  var security = options.security;

  assert(linkPath, 'linkPath required');

  switch (security || null) {
    case 'PUBLIC':
    case null:
      return {
        type: 'GH_ORG',
        members: 'PUBLIC',
        admins: 'GH_ORG_MEMBER',
        public: true,
        linkPath: linkPath,
        externalId: externalId
      };

    case 'PRIVATE':
      return {
        type: 'GH_ORG',
        members: 'GH_ORG_MEMBER',
        admins: 'GH_ORG_MEMBER',
        public: false,
        linkPath: linkPath,
        externalId: externalId
      };

    default:
      throw new StatusError(500, 'Unknown security type: ' + security);
  }
}

function generateGhRepoSecurityDescriptor(user, options) {
  var externalId = options.externalId;
  var linkPath = options.linkPath;
  var security = options.security;

  assert(linkPath, 'linkPath required');

  switch (security) {
    case 'PUBLIC':
      return {
        type: 'GH_REPO',
        members: 'PUBLIC',
        admins: 'GH_REPO_PUSH',
        public: true,
        linkPath: linkPath,
        externalId: externalId
      };

    case 'PRIVATE':
      return {
        type: 'GH_REPO',
        members: 'GH_REPO_ACCESS',
        admins: 'GH_REPO_PUSH',
        public: false,
        linkPath: linkPath,
        externalId: externalId
      };

    default:
      throw new StatusError(500, 'Unknown security type: ' + security);
  }
}

function generateGlGroupSecurityDescriptor(user, { linkPath, externalId, security }) {
  assert(linkPath, 'linkPath required');

  switch (security || null) {
    case 'PUBLIC':
    case null:
      return {
        type: 'GL_GROUP',
        members: 'PUBLIC',
        admins: 'GL_GROUP_MAINTAINER',
        public: true,
        linkPath: linkPath,
        externalId: externalId
      };

    case 'PRIVATE':
      return {
        type: 'GL_GROUP',
        members: 'GL_GROUP_MEMBER',
        admins: 'GL_GROUP_MAINTAINER',
        public: false,
        linkPath: linkPath,
        externalId: externalId
      };

    default:
      throw new StatusError(500, 'Unknown security type: ' + security);
  }
}

function generateGlProjectSecurityDescriptor(user, { linkPath, externalId, security }) {
  assert(linkPath, 'linkPath required');

  switch (security || null) {
    case 'PUBLIC':
    case null:
      return {
        type: 'GL_PROJECT',
        members: 'PUBLIC',
        admins: 'GL_PROJECT_MAINTAINER',
        public: true,
        linkPath: linkPath,
        externalId: externalId
      };

    case 'PRIVATE':
      return {
        type: 'GL_PROJECT',
        members: 'GL_PROJECT_MEMBER',
        admins: 'GL_PROJECT_MAINTAINER',
        public: false,
        linkPath: linkPath,
        externalId: externalId
      };

    default:
      throw new StatusError(500, 'Unknown security type: ' + security);
  }
}

function generateGlUserSecurityDescriptor(user, { linkPath, externalId, security }) {
  assert(linkPath, 'linkPath required');

  switch (security || null) {
    case 'PUBLIC':
    case null:
      return {
        type: 'GL_USER',
        members: 'PUBLIC',
        admins: 'GL_USER_SAME',
        public: true,
        linkPath: linkPath,
        externalId: externalId
      };

    case 'PRIVATE':
      return {
        type: 'GL_USER',
        members: 'INVITE',
        admins: 'GL_USER_SAME',
        public: false,
        linkPath: linkPath,
        externalId: externalId
      };

    default:
      throw new StatusError(500, 'Unknown security type: ' + security);
  }
}

function generateDefaultSecurityDescriptor(user, options) {
  var members;
  var isPublic;

  switch (options.security || null) {
    case null:
    case 'PUBLIC':
      members = 'PUBLIC';
      isPublic = true;
      break;

    case 'PRIVATE':
      members = 'INVITE';
      isPublic = false;
      break;

    default:
      throw new StatusError(500, 'Unknown security type: ' + options.security);
  }

  return {
    type: null,
    admins: 'MANUAL',
    public: isPublic,
    members: members,
    extraMembers: [],
    extraAdmins: [user._id]
  };
}

function generateGroupSecurityDescriptor(user, options) {
  var members;
  var isPublic;

  switch (options.security || null) {
    case null:
    case 'PUBLIC':
      members = 'PUBLIC';
      isPublic = true;
      break;

    case 'PRIVATE':
      members = 'INVITE';
      isPublic = false;
      break;

    case 'INHERITED':
      members = 'INVITE_OR_ADMIN';
      isPublic = false;
      break;

    default:
      throw new StatusError(500, 'Unknown security type: ' + options.security);
  }

  var internalId = options.internalId;
  if (!internalId) {
    throw new StatusError(500, 'Group security descriptor types must have an internalId');
  }

  return {
    type: 'GROUP',
    admins: 'GROUP_ADMIN',
    public: isPublic,
    members: members,
    extraMembers: [],
    extraAdmins: [],
    internalId: internalId
  };
}

function generate(user, options) {
  options.type = options.type || null;

  switch (options.type) {
    case null:
      return generateDefaultSecurityDescriptor(user, options);

    case 'GROUP':
      return generateGroupSecurityDescriptor(user, options);

    case 'GH_USER':
      return generateGhUserSecurityDescriptor(user, options);

    case 'GH_REPO':
      return generateGhRepoSecurityDescriptor(user, options);

    case 'GH_ORG':
      return generateGhOrgSecurityDescriptor(user, options);

    case 'GL_GROUP':
      return generateGlGroupSecurityDescriptor(user, options);

    case 'GL_PROJECT':
      return generateGlProjectSecurityDescriptor(user, options);

    case 'GL_USER':
      return generateGlUserSecurityDescriptor(user, options);

    default:
      throw new StatusError(500, 'Unknown type: ' + options.type);
  }
}

module.exports = {
  generate: generate
};
