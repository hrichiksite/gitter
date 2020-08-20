'use strict';

var assert = require('assert');
var persistence = require('gitter-web-persistence');
var transform = require('../../lib/security-descriptor/transform');

describe('transform-test', function() {
  var groupId = 1;

  var FIXTURES = [
    {
      name: 'idempotent',
      Model: persistence.Group,
      newType: 'GROUP',
      in: {
        type: 'GROUP',
        members: 'INVITE',
        admins: 'GROUP_ADMIN',
        public: true,
        linkPath: null,
        internalId: groupId,
        externalId: null,
        extraAdmins: [],
        extraMembers: []
      },
      out: {
        type: 'GROUP',
        members: 'INVITE',
        admins: 'GROUP_ADMIN',
        public: true,
        linkPath: null,
        internalId: groupId,
        externalId: null,
        extraAdmins: [],
        extraMembers: []
      },
      groupId: groupId
    },
    {
      name: 'group remove backing, public',
      Model: persistence.Group,
      newType: null,
      in: {
        type: 'GH_REPO',
        members: 'PUBLIC',
        admins: 'GH_REPO_PUSH',
        public: true,
        linkPath: 'x/y',
        internalId: null,
        externalId: '1',
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      out: {
        type: null,
        members: 'PUBLIC',
        admins: 'MANUAL',
        public: true,
        linkPath: null,
        internalId: null,
        externalId: null,
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      groupId: groupId
    },
    {
      name: 'room switch from GitLab group to normal group, public',
      Model: persistence.Troupe,
      newType: 'GROUP',
      in: {
        type: 'GL_GROUP',
        members: 'PUBLIC',
        admins: 'GL_GROUP_MAINTAINER',
        public: true,
        linkPath: 'x/y',
        internalId: null,
        externalId: '1',
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      out: {
        type: 'GROUP',
        members: 'PUBLIC',
        admins: 'GROUP_ADMIN',
        public: true,
        linkPath: null,
        internalId: groupId,
        externalId: null,
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      groupId: groupId
    },
    {
      name: 'room switch from GitLab project to normal group, public',
      Model: persistence.Troupe,
      newType: 'GROUP',
      in: {
        type: 'GL_PROJECT',
        members: 'PUBLIC',
        admins: 'GL_PROJECT_MAINTAINER',
        public: true,
        linkPath: 'x/y',
        internalId: null,
        externalId: '1',
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      out: {
        type: 'GROUP',
        members: 'PUBLIC',
        admins: 'GROUP_ADMIN',
        public: true,
        linkPath: null,
        internalId: groupId,
        externalId: null,
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      groupId: groupId
    },
    {
      name: 'room switch from GitLab user to normal group, public',
      Model: persistence.Troupe,
      newType: 'GROUP',
      in: {
        type: 'GL_USER',
        members: 'PUBLIC',
        admins: 'GL_USER_SAME',
        public: true,
        linkPath: 'myuser',
        internalId: null,
        externalId: '1',
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      out: {
        type: 'GROUP',
        members: 'PUBLIC',
        admins: 'GROUP_ADMIN',
        public: true,
        linkPath: null,
        internalId: groupId,
        externalId: null,
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      groupId: groupId
    },
    {
      name: 'room switch from github to group, public',
      Model: persistence.Troupe,
      newType: 'GROUP',
      in: {
        type: 'GH_REPO',
        members: 'PUBLIC',
        admins: 'GH_REPO_PUSH',
        public: true,
        linkPath: 'x/y',
        internalId: null,
        externalId: '1',
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      out: {
        type: 'GROUP',
        members: 'PUBLIC',
        admins: 'GROUP_ADMIN',
        public: true,
        linkPath: null,
        internalId: groupId,
        externalId: null,
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      groupId: groupId
    },
    {
      name: 'group remove backing, private',
      Model: persistence.Group,
      newType: null,
      in: {
        type: 'GH_REPO',
        members: 'GH_REPO_ACCESS',
        admins: 'GH_REPO_PUSH',
        public: false,
        linkPath: 'x/y',
        internalId: null,
        externalId: '1',
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      out: {
        type: null,
        members: 'INVITE_OR_ADMIN',
        admins: 'MANUAL',
        public: false,
        linkPath: null,
        internalId: null,
        externalId: null,
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      groupId: groupId
    },
    {
      name: 'room switch from GitLab to group, private',
      Model: persistence.Troupe,
      newType: 'GROUP',
      in: {
        type: 'GL_GROUP',
        members: 'GL_GROUP_MEMBER',
        admins: 'GL_GROUP_MAINTAINER',
        public: false,
        linkPath: 'x/y',
        internalId: null,
        externalId: '1',
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      out: {
        type: 'GROUP',
        members: 'INVITE_OR_ADMIN',
        admins: 'GROUP_ADMIN',
        public: false,
        linkPath: null,
        internalId: groupId,
        externalId: null,
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      groupId: groupId
    },
    {
      name: 'room switch from github to group, private',
      Model: persistence.Troupe,
      newType: 'GROUP',
      in: {
        type: 'GH_REPO',
        members: 'GH_REPO_ACCESS',
        admins: 'GH_REPO_PUSH',
        public: false,
        linkPath: 'x/y',
        internalId: null,
        externalId: '1',
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      out: {
        type: 'GROUP',
        members: 'INVITE_OR_ADMIN',
        admins: 'GROUP_ADMIN',
        public: false,
        linkPath: null,
        internalId: groupId,
        externalId: null,
        extraAdmins: ['a'],
        extraMembers: ['b']
      },
      groupId: groupId
    }
  ];

  FIXTURES.forEach(function(meta) {
    it(meta.name, function() {
      return transform(meta.Model, meta.in, meta.newType, { groupId: meta.groupId }).then(function(
        result
      ) {
        assert.strictEqual(result.type, meta.out.type);
        assert.strictEqual(result.members, meta.out.members);
        assert.strictEqual(result.admins, meta.out.admins);
        assert.strictEqual(result.public, meta.out.public);
        assert.strictEqual(result.linkPath, meta.out.linkPath);
        assert.strictEqual(result.internalId, meta.out.internalId);
        assert.strictEqual(result.externalId, meta.out.externalId);
        assert.deepEqual(result.extraAdmins.map(String), meta.out.extraAdmins.map(String));
        assert.deepEqual(result.extraMembers.map(String), meta.out.extraMembers.map(String));
      });
    });
  });
});
