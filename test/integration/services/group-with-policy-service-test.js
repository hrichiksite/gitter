'use strict';

const testRequire = require('../test-require');
const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const GroupWithPolicyService = testRequire('./services/group-with-policy-service');
const securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor');

const isAdminPolicy = {
  canAdmin: function() {
    return Promise.resolve(true);
  },
  canJoin: function() {
    return Promise.resolve(true);
  }
};

describe('group-with-policy-service #slow', function() {
  let group1WithPolicyService;
  let group2WithPolicyService;
  let group3WithPolicyService;

  fixtureLoader.ensureIntegrationEnvironment(
    '#integrationUser1',
    'GITTER_INTEGRATION_ORG_ID',
    'GITTER_INTEGRATION_ORG',
    'GITTER_INTEGRATION_REPO_ID',
    'GITTER_INTEGRATION_REPO',
    'GITTER_INTEGRATION_USER_ID',
    'GITTER_INTEGRATION_USERNAME',
    'GITTER_INTEGRATION_COMMUNITY',
    'GITTER_INTEGRATION_ROOM'
  );

  const linkPath =
    fixtureLoader.GITTER_INTEGRATION_USERNAME + '/' + fixtureLoader.GITTER_INTEGRATION_REPO;

  const fixture = fixtureLoader.setupEach({
    deleteDocuments: {
      Group: [
        { lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() },
        { lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() },
        { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() }
      ],
      Troupe: [
        {
          lcUri:
            fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() +
            '/' +
            fixtureLoader.GITTER_INTEGRATION_REPO.toLowerCase()
        },
        {
          lcUri:
            fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() +
            '/' +
            fixtureLoader.GITTER_INTEGRATION_ROOM.toLowerCase()
        },
        {
          lcUri:
            fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() +
            '/' +
            fixtureLoader.GITTER_INTEGRATION_ROOM.toLowerCase()
        },
        {
          lcUri:
            fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() +
            '/' +
            fixtureLoader.GITTER_INTEGRATION_ROOM.toLowerCase()
        }
      ]
    },
    user1: '#integrationUser1',
    // group1 is a github user backed group
    group1: {
      uri: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase(),
      securityDescriptor: {
        type: 'GH_USER',
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
        extraAdmins: ['user1']
      }
    },
    // group2 is a "normal" group
    group2: {
      securityDescriptor: {
        extraAdmins: ['user1']
      }
    },
    // group3 is a github org backed group
    group3: {
      uri: fixtureLoader.GITTER_INTEGRATION_ORG,
      lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase(),
      securityDescriptor: {
        type: 'GH_ORG',
        linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
        extraAdmins: ['user1']
      }
    }
  });

  beforeEach(function() {
    group1WithPolicyService = new GroupWithPolicyService(
      fixture.group1,
      fixture.user1,
      isAdminPolicy
    );
    group2WithPolicyService = new GroupWithPolicyService(
      fixture.group2,
      fixture.user1,
      isAdminPolicy
    );
    group3WithPolicyService = new GroupWithPolicyService(
      fixture.group3,
      fixture.user1,
      isAdminPolicy
    );
  });

  describe('normal rooms', () => {
    it('should create a normal room (public)', async () => {
      const topic = 'litter us with puns';
      const createRoomResult = await group2WithPolicyService.createRoom({
        type: null,
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        topic: topic,
        security: 'PUBLIC'
      });

      const room = createRoomResult.troupe;
      assert.strictEqual(
        room.uri,
        fixture.group2.uri + '/' + fixtureLoader.GITTER_INTEGRATION_ROOM
      );
      assert.strictEqual(
        room.lcUri,
        fixture.group2.lcUri + '/' + fixtureLoader.GITTER_INTEGRATION_ROOM.toLowerCase()
      );
      assert.equal(room.topic, topic);
      assert.equal(room.groupId, fixture.group2.id);

      const securityDescriptor = await securityDescriptorService.room.findById(room._id, null);

      assert.deepEqual(securityDescriptor, {
        type: null,
        public: true,
        admins: 'MANUAL',
        members: 'PUBLIC'
      });
    });

    it('should create a normal room (private)', async () => {
      const topic = 'should we change the topic?';
      const createRoomResult = await group2WithPolicyService.createRoom({
        type: null,
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        topic: topic,
        security: 'PRIVATE'
      });

      const room = createRoomResult.troupe;
      const securityDescriptor = await securityDescriptorService.room.findById(room._id, null);

      assert.deepEqual(securityDescriptor, {
        type: null,
        public: false,
        admins: 'MANUAL',
        members: 'INVITE'
      });
    });

    it('should throw an error when validateRoomName fails', async () => {
      try {
        await group2WithPolicyService.createRoom({
          type: null,
          name: '',
          security: 'PUBLIC'
        });
        assert.ok(false, 'expected error');
      } catch (err) {
        assert.strictEqual(err.status, 400);
      }
    });

    it('should throw an error when the room uri is already taken', async () => {
      const roomOpts = {
        type: null,
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        security: 'PUBLIC'
      };

      try {
        // create once
        await group2WithPolicyService.createRoom(roomOpts);
        // create twice
        await group2WithPolicyService.createRoom(roomOpts);

        assert.ok(false, 'error expected');
      } catch (err) {
        assert.deepEqual(err.status, 409);
      }
    });
  });

  describe('GitHub repo rooms', () => {
    it('should create a repo room (inherited)', async () => {
      const createRoomResult = await group1WithPolicyService.createRoom({
        type: 'GH_REPO',
        name: fixtureLoader.GITTER_INTEGRATION_REPO,
        security: 'PUBLIC',
        linkPath: linkPath
      });

      const room = createRoomResult.troupe;
      const securityDescriptor = await securityDescriptorService.room.findById(room._id, null);

      assert.deepEqual(securityDescriptor, {
        type: 'GH_REPO',
        members: 'PUBLIC',
        admins: 'GH_REPO_PUSH',
        public: true,
        linkPath: linkPath,
        externalId: fixtureLoader.GITTER_INTEGRATION_REPO_ID
      });
    });

    it('should create a repo room (public)', async () => {
      const createRoomResult = await group1WithPolicyService.createRoom({
        type: 'GH_REPO',
        name: fixtureLoader.GITTER_INTEGRATION_REPO,
        security: 'PUBLIC',
        linkPath: linkPath
      });

      const room = createRoomResult.troupe;
      const securityDescriptor = await securityDescriptorService.room.findById(room._id, null);

      assert.deepEqual(securityDescriptor, {
        type: 'GH_REPO',
        members: 'PUBLIC',
        admins: 'GH_REPO_PUSH',
        public: true,
        linkPath: linkPath,
        externalId: fixtureLoader.GITTER_INTEGRATION_REPO_ID
      });
    });

    it('should create a repo room (private)', async () => {
      const createRoomResult = await group1WithPolicyService.createRoom({
        type: 'GH_REPO',
        name: fixtureLoader.GITTER_INTEGRATION_REPO,
        security: 'PRIVATE',
        linkPath: linkPath
      });

      const room = createRoomResult.troupe;
      const securityDescriptor = await securityDescriptorService.room.findById(room._id, null);

      assert.deepEqual(securityDescriptor, {
        type: 'GH_REPO',
        members: 'GH_REPO_ACCESS',
        admins: 'GH_REPO_PUSH',
        public: false,
        linkPath: linkPath,
        externalId: fixtureLoader.GITTER_INTEGRATION_REPO_ID
      });
    });
  });

  describe('GitHub org rooms', () => {
    it('should create an org room (public)', async () => {
      const createRoomResult = await group3WithPolicyService.createRoom({
        type: 'GH_ORG',
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        security: 'PUBLIC',
        linkPath: fixtureLoader.GITTER_INTEGRATION_ORG
      });

      const room = createRoomResult.troupe;
      const securityDescriptor = await securityDescriptorService.room.findById(room._id, null);

      assert.deepEqual(securityDescriptor, {
        type: 'GH_ORG',
        members: 'PUBLIC',
        admins: 'GH_ORG_MEMBER',
        public: true,
        linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
        externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID
      });
    });

    it('should create an org room (private)', async () => {
      const createRoomResult = await group3WithPolicyService.createRoom({
        type: 'GH_ORG',
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        security: 'PRIVATE',
        linkPath: fixtureLoader.GITTER_INTEGRATION_ORG
      });

      const room = createRoomResult.troupe;
      const securityDescriptor = await securityDescriptorService.room.findById(room._id, null);

      assert.deepEqual(securityDescriptor, {
        type: 'GH_ORG',
        members: 'GH_ORG_MEMBER',
        admins: 'GH_ORG_MEMBER',
        public: false,
        linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
        externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID
      });
    });
  });

  describe('user rooms', () => {
    it('should create a user room - public', async () => {
      const createRoomResult = await group1WithPolicyService.createRoom({
        type: 'GH_USER',
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        security: 'PUBLIC',
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME
      });

      const room = createRoomResult.troupe;
      const securityDescriptor = await securityDescriptorService.room.findById(room._id, null);

      assert.deepEqual(securityDescriptor, {
        type: 'GH_USER',
        members: 'PUBLIC',
        admins: 'GH_USER_SAME',
        public: true,
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
        externalId: fixtureLoader.GITTER_INTEGRATION_USER_ID
      });
    });

    it('should create a user room (private)', async () => {
      const createRoomResult = await group1WithPolicyService.createRoom({
        type: 'GH_USER',
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        security: 'PRIVATE',
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME
      });

      const room = createRoomResult.troupe;
      const securityDescriptor = await securityDescriptorService.room.findById(room._id, null);

      assert.deepEqual(securityDescriptor, {
        type: 'GH_USER',
        members: 'INVITE',
        admins: 'GH_USER_SAME',
        public: false,
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
        externalId: fixtureLoader.GITTER_INTEGRATION_USER_ID
      });
    });
  });
});
