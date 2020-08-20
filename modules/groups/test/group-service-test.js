'use strict';

var Promise = require('bluebird');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor');
var proxyquireNoCallThru = require('proxyquire').noCallThru();
var StatusError = require('statuserror');

// stub out this check because otherwise we end up with a the tests all
// clashing with the user that's required to have access to create those
// groups..
var groupService = proxyquireNoCallThru('../lib/group-service', {
  './group-uri-checker': function() {
    return Promise.resolve({
      allowCreate: true
    });
  }
});

function compareSets(a, b) {
  // Sort before comparing, but don't mutate them when sorting. Not that that
  // matters at the time of writing, but just in case people start using this
  // elsewhere.
  // (Yes there are a million ways to do this.)
  assert.deepEqual(a.slice().sort(), b.slice().sort());
}

describe('group-service', function() {
  describe('integration tests #slow', function() {
    fixtureLoader.ensureIntegrationEnvironment(
      '#integrationUser1',
      '#integrationGitlabUser1',
      'GITTER_INTEGRATION_ORG',
      'GITTER_INTEGRATION_USERNAME',
      'GITLAB_GROUP1_ID',
      'GITLAB_GROUP1_URI',
      'GITLAB_PUBLIC_PROJECT1_ID',
      'GITLAB_PUBLIC_PROJECT1_URI'
    );

    describe('createGroup', function() {
      var fixture = fixtureLoader.setup({
        deleteDocuments: {
          Group: [
            { lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() },
            { lcUri: fixtureLoader.GITTER_INTEGRATION_REPO.toLowerCase() },
            { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() },
            { lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() },
            { lcUri: fixtureLoader.GITLAB_GROUP1_URI.toLowerCase() },
            { lcUri: 'group-uri-for-project-based-group' },
            { lcUri: 'bob' }
          ]
        },
        user1: '#integrationUser1',
        userGitlab1: '#integrationGitlabUser1'
      });

      it('should create a group based on a GitLab user', async () => {
        const groupUri = fixtureLoader.GITLAB_USER_USERNAME;
        const user = fixture.userGitlab1;

        const group = await groupService.createGroup(user, {
          type: 'GL_USER',
          name: 'Some GitLab user',
          uri: groupUri,
          linkPath: groupUri
        });

        assert.strictEqual(group.name, 'Some GitLab user');
        assert.strictEqual(group.uri, groupUri);
        assert.strictEqual(group.lcUri, groupUri.toLowerCase());

        const securityDescriptor = await securityDescriptorService.group.findById(group._id, null);

        assert.deepEqual(securityDescriptor, {
          admins: 'GL_USER_SAME',
          externalId: fixtureLoader.GITLAB_USER_ID,
          linkPath: groupUri,
          members: 'PUBLIC',
          public: true,
          type: 'GL_USER'
        });
      });

      it('should create a group based on a GitLab group', async () => {
        const groupUri = fixtureLoader.GITLAB_GROUP1_URI;
        const user = fixture.userGitlab1;

        const group = await groupService.createGroup(user, {
          type: 'GL_GROUP',
          name: 'Some GitLab group',
          uri: groupUri,
          linkPath: groupUri
        });

        assert.strictEqual(group.name, 'Some GitLab group');
        assert.strictEqual(group.uri, groupUri);
        assert.strictEqual(group.lcUri, groupUri.toLowerCase());

        const securityDescriptor = await securityDescriptorService.group.findById(group._id, null);

        assert.deepEqual(securityDescriptor, {
          admins: 'GL_GROUP_MAINTAINER',
          externalId: fixtureLoader.GITLAB_GROUP1_ID,
          linkPath: groupUri,
          members: 'PUBLIC',
          public: true,
          type: 'GL_GROUP'
        });
      });

      it('should create a group based on a GitLab project', async () => {
        const projectUri = fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI;
        const user = fixture.userGitlab1;

        const uri = 'group-uri-for-project-based-group';
        const group = await groupService.createGroup(user, {
          type: 'GL_PROJECT',
          name: 'Some GitLab project',
          uri,
          linkPath: projectUri
        });

        assert.strictEqual(group.name, 'Some GitLab project');
        assert.strictEqual(group.uri, uri);
        assert.strictEqual(group.lcUri, uri);

        const securityDescriptor = await securityDescriptorService.group.findById(group._id, null);

        assert.deepEqual(securityDescriptor, {
          admins: 'GL_PROJECT_MAINTAINER',
          externalId: fixtureLoader.GITLAB_PUBLIC_PROJECT1_ID,
          linkPath: projectUri,
          members: 'PUBLIC',
          public: true,
          type: 'GL_PROJECT'
        });
      });

      it('should create a group based on a GitHub org', async () => {
        const groupUri = fixtureLoader.GITTER_INTEGRATION_ORG;
        const user = fixture.user1;

        const group = await groupService.createGroup(user, {
          type: 'GH_ORG',
          name: 'Bob',
          uri: groupUri,
          linkPath: groupUri
        });

        assert.strictEqual(group.name, 'Bob');
        assert.strictEqual(group.uri, groupUri);
        assert.strictEqual(group.lcUri, groupUri.toLowerCase());

        const securityDescriptor = await securityDescriptorService.group.findById(group._id, null);

        assert.deepEqual(securityDescriptor, {
          admins: 'GH_ORG_MEMBER',
          externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID,
          linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
          members: 'PUBLIC',
          public: true,
          type: 'GH_ORG'
        });
      });

      it('should create a group for a GitHub repo', function() {
        var groupUri = fixtureLoader.GITTER_INTEGRATION_REPO;
        var linkPath = fixtureLoader.GITTER_INTEGRATION_REPO_FULL;
        var user = fixture.user1;
        return groupService
          .createGroup(user, {
            type: 'GH_REPO',
            name: 'Bob',
            uri: groupUri,
            linkPath: linkPath
          })
          .then(function(group) {
            assert.strictEqual(group.name, 'Bob');
            assert.strictEqual(group.uri, groupUri);
            assert.strictEqual(group.lcUri, groupUri.toLowerCase());
            return securityDescriptorService.group.findById(group._id, null);
          })
          .then(function(securityDescriptor) {
            assert.deepEqual(securityDescriptor, {
              admins: 'GH_REPO_PUSH',
              externalId: fixtureLoader.GITTER_INTEGRATION_REPO_ID,
              linkPath: linkPath,
              members: 'PUBLIC',
              public: true,
              type: 'GH_REPO'
            });
          });
      });

      it('should create a group for an unknown GitHub owner', function() {
        var user = fixture.user1;
        return groupService
          .createGroup(user, {
            type: 'GH_GUESS',
            name: 'Bob',
            // This also tests that you can have a group with an arbitrary uri
            // that is backed by a github user/org with a linkPath that is
            // different to the group's uri.
            uri: 'Bob',
            linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME
          })
          .then(function(group) {
            assert.strictEqual(group.name, 'Bob');
            assert.strictEqual(group.uri, 'Bob');
            assert.strictEqual(group.lcUri, 'bob');
            return securityDescriptorService.group.findById(group._id, null);
          })
          .then(function(securityDescriptor) {
            assert.deepEqual(securityDescriptor, {
              admins: 'GH_USER_SAME',
              externalId: fixtureLoader.GITTER_INTEGRATION_USER_ID,
              linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
              members: 'PUBLIC',
              public: true,
              type: 'GH_USER'
            });
          });
      });

      it('should create a group for a new style community', function() {
        var user = fixture.user1;
        return groupService
          .createGroup(user, {
            name: 'Bob',
            uri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY
          })
          .then(function(group) {
            assert.strictEqual(group.name, 'Bob');
            assert.strictEqual(group.uri, fixtureLoader.GITTER_INTEGRATION_COMMUNITY);
            assert.strictEqual(
              group.lcUri,
              fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase()
            );
            return securityDescriptorService.group.findById(group._id, null);
          })
          .then(function(securityDescriptor) {
            assert.deepEqual(securityDescriptor, {
              type: null,
              admins: 'MANUAL',
              public: true,
              members: 'PUBLIC'
            });
          });
      });

      it('should throw a 409 if a URL is not available', function() {
        var user = fixture.user1;
        var groupService = proxyquireNoCallThru('../lib/group-service', {
          './group-uri-checker': function() {
            return Promise.resolve({
              allowCreate: false
            });
          }
        });
        groupService
          .createGroup(user, {
            name: 'Bob',
            uri: 'bob'
          })
          .then(function() {
            assert.ok(false, 'Error Expected');
          })
          .catch(StatusError, function(err) {
            assert.strictEqual(err.status, 409);
          });
      });
    });

    describe('findById #slow', function() {
      var fixture = fixtureLoader.setup({
        group1: {}
      });

      it('should find a group', function() {
        return groupService.findById(fixture.group1._id, { lean: true }).then(function(group) {
          assert.strictEqual(group.name, fixture.group1.name);
          assert.strictEqual(group.uri, fixture.group1.uri);
          assert.strictEqual(group.lcUri, fixture.group1.lcUri);
        });
      });
    });

    describe('findRoomsIdForGroup', function() {
      var fixture = fixtureLoader.setup({
        user1: {},
        user2: {},
        group1: {},
        troupe1: { group: 'group1', security: 'PUBLIC' },
        troupe2: { group: 'group1', security: 'PUBLIC' },
        troupe3: { group: 'group1', security: 'PRIVATE', users: ['user1'] },
        troupe4: { group: 'group1', security: 'PRIVATE' }
      });

      it('should find the roomIds for group for an anonymous user', function() {
        return groupService.findRoomsIdForGroup(fixture.group1._id).then(function(roomIds) {
          var roomStrings = roomIds.map(String);
          roomStrings.sort();

          var expectedStrings = [fixture.troupe1.id, fixture.troupe2.id];
          expectedStrings.sort();

          assert.deepEqual(roomStrings, expectedStrings);
        });
      });

      it('should find the roomIds for group and user with troupes', function() {
        return groupService
          .findRoomsIdForGroup(fixture.group1._id, fixture.user1._id)
          .then(function(roomIds) {
            compareSets(roomIds.map(String), [
              fixture.troupe1.id,
              fixture.troupe2.id,
              fixture.troupe3.id
            ]);
          });
      });

      it('should find the roomIds for group and user without troupes', function() {
        return groupService
          .findRoomsIdForGroup(fixture.group1._id, fixture.user2._id)
          .then(function(roomIds) {
            compareSets(roomIds.map(String), [fixture.troupe1.id, fixture.troupe2.id]);
          });
      });
    });
  });

  describe('findRoomsInGroup', () => {
    var fixture = fixtureLoader.setup({
      group1: {},
      troupe1: { group: 'group1', security: 'PUBLIC' },
      troupe2: { group: 'group1', security: 'PUBLIC' },
      troupe3: { group: 'group1', security: 'PRIVATE' },
      troupe4: { group: 'group1', security: 'PRIVATE' }
    });

    it('should find rooms in group', () => {
      return groupService.findRoomsInGroup(fixture.group1.get('id')).then(function(results) {
        assert.strictEqual(results.length, 4);
      });
    });
  });

  describe('deleteGroup', () => {
    var fixture = fixtureLoader.setup({
      group1: {}
    });

    it('should delete group', () => {
      return groupService
        .deleteGroup(fixture.group1)
        .then(function() {
          return groupService.findById(fixture.group1.get('id'));
        })
        .then(groupResult => {
          assert.strictEqual(groupResult, null);
        });
    });
  });
});
