'use strict';

var assert = require('assert');
var proxyquireNoCallThru = require('proxyquire').noCallThru();
var PolicyDelegateTransportError = require('../../lib/policies/policy-delegate-transport-error');
var ObjectID = require('mongodb').ObjectID;

function getName(meta, index) {
  if (meta.name) {
    return '#' + index + ' ' + meta.name;
  }

  return Object.keys(meta).reduce(function(memo, key, index) {
    var value = meta[key];
    if (value === undefined) return memo;
    var pair = key + '=' + value;
    if (index) {
      return memo + ',' + pair;
    } else {
      return pair;
    }
  }, '#' + index + ' ');
}

var FIXTURES = [
  {
    name: 'Anonymous user accessing PUBLIC/MANUAL room',
    anonymous: true,
    inRoom: false,
    membersPolicy: 'PUBLIC',
    public: true,
    adminPolicy: 'MANUAL',
    read: true,
    write: false,
    join: false,
    admin: false,
    addUser: false
  },
  {
    name: 'Anonymous user accessing INVITE/MANUAL room',
    anonymous: true,
    inRoom: false,
    membersPolicy: 'INVITE',
    adminPolicy: 'MANUAL',
    read: false,
    write: false,
    join: false,
    admin: false,
    addUser: false
  },
  {
    name: 'Authed user accessing PUBLIC/MANUAL room',
    inRoom: false,
    membersPolicy: 'PUBLIC',
    public: true,
    adminPolicy: 'MANUAL',
    read: true,
    write: true,
    join: true,
    admin: false,
    addUser: true
  },
  {
    name: 'Authed user accessing PUBLIC/MANUAL room, in extraMembers',
    inRoom: false,
    membersPolicy: 'PUBLIC',
    public: true,
    adminPolicy: 'MANUAL',
    isInExtraMembers: true,
    read: true,
    write: true,
    join: true,
    admin: false,
    addUser: true
  },
  {
    name: 'Authed user accessing INVITE/MANUAL room, not in room',
    inRoom: false,
    membersPolicy: 'INVITE',
    adminPolicy: 'MANUAL',
    isInExtraMembers: false,
    isInExtraAdmins: false,
    read: false,
    write: false,
    join: false,
    admin: false,
    addUser: false,
    handleReadAccessFailure: true
  },
  {
    name: 'Authed user accessing INVITE/MANUAL room, not in room',
    inRoom: true,
    membersPolicy: 'INVITE',
    adminPolicy: 'MANUAL',
    isInExtraMembers: false,
    isInExtraAdmins: false,
    read: true,
    write: true,
    join: true,
    admin: false,
    addUser: true
  },
  {
    name: 'Authed user accessing INVITE/MANUAL room, not in room, in extraMembers',
    inRoom: false,
    membersPolicy: 'INVITE',
    adminPolicy: 'MANUAL',
    isInExtraMembers: true,
    isInExtraAdmins: false,
    read: true,
    write: true,
    join: true,
    admin: false,
    addUser: true
  },
  {
    name: 'Authed user accessing INVITE/MANUAL room, not in room, in extraMembers',
    inRoom: false,
    membersPolicy: 'INVITE',
    adminPolicy: 'MANUAL',
    isInExtraMembers: true,
    isInExtraAdmins: false,
    read: true,
    write: true,
    join: true,
    admin: false,
    addUser: true
  },
  {
    name: 'Authed user accessing INVITE/MANUAL room, not in room, in extraAdmins',
    inRoom: false,
    membersPolicy: 'INVITE',
    adminPolicy: 'MANUAL',
    isInExtraMembers: false,
    isInExtraAdmins: true,
    read: true,
    write: true,
    join: true,
    admin: true,
    addUser: true
  },
  {
    name: 'Authed user accessing X/Y room, not in room, no recent success',
    hasPolicyDelegate: true,
    recentSuccess: { X: false, Y: false },
    expectRecordSuccessfulCheck: true,
    inRoom: false,
    membersPolicy: 'X',
    adminPolicy: 'Y',
    isInExtraMembers: false,
    isInExtraAdmins: false,
    expectedPolicy1: 'X',
    expectedPolicyResult1: true,
    expectedPolicy2: 'Y',
    expectedPolicyResult2: false,
    read: true,
    write: true,
    join: true,
    admin: false,
    addUser: true
  },
  {
    name: 'Authed user accessing X/Y room, canRead, not in room, with recent success',
    hasPolicyDelegate: true,
    recentSuccess: { X: true, Y: false },
    expectRecordSuccessfulCheck: false,
    inRoom: false,
    membersPolicy: 'X',
    adminPolicy: 'Y',
    isInExtraMembers: false,
    isInExtraAdmins: false,
    expectedPolicy1: 'X',
    expectedPolicyResult1: true,
    expectedPolicy2: undefined,
    expectedPolicyResult2: undefined,
    read: true
  },

  {
    name: 'Authed user accessing X/Y room, canJoin, not in room, with recent success',
    hasPolicyDelegate: true,
    recentSuccess: { X: true, Y: false },
    expectRecordSuccessfulCheck: true,
    inRoom: false,
    membersPolicy: 'X',
    adminPolicy: 'Y',
    isInExtraMembers: false,
    isInExtraAdmins: false,
    expectedPolicy1: 'X',
    expectedPolicyResult1: true,
    expectedPolicy2: 'Y',
    expectedPolicyResult2: false,
    join: true
  },
  {
    name: 'Authed user accessing X/Y public room, without recent success and with backend fail',
    hasPolicyDelegate: true,
    recentSuccess: { X: false, Y: false },
    expectRecordSuccessfulCheck: false,
    membersPolicy: 'X',
    adminPolicy: 'Y',
    expectedPolicy1: 'X',
    expectedPolicyResult1: 'throw',
    expectedPolicy2: 'Y',
    expectedPolicyResult2: 'throw',
    public: true,
    read: true,
    inRoom: false
  },
  {
    name: 'Authed user accessing X/Y public room, without recent success and with backend fail',
    hasPolicyDelegate: true,
    recentSuccess: { X: false, Y: false },
    expectRecordSuccessfulCheck: false,
    membersPolicy: 'X',
    adminPolicy: 'Y',
    expectedPolicy1: 'X',
    expectedPolicyResult1: 'throw',
    expectedPolicy2: 'Y',
    expectedPolicyResult2: 'throw',
    public: false,
    read: false,
    handleReadAccessFailure: true
  },
  {
    name: 'Authed user accessing X/Y room, without policy delegate',
    hasPolicyDelegate: false,
    membersPolicy: 'X',
    adminPolicy: 'Y',
    read: false,
    handleReadAccessFailure: true
  },
  {
    name:
      'Authed user in private room, backend failed without recent success, should not be removed from room',
    hasPolicyDelegate: true,
    recentSuccess: { X: false, Y: false },
    expectRecordSuccessfulCheck: false,
    membersPolicy: 'X',
    adminPolicy: 'Y',
    expectedPolicy1: 'X',
    expectedPolicyResult1: 'throw',
    expectedPolicy2: 'Y',
    expectedPolicyResult2: 'throw',
    public: false,
    read: true,
    handleReadAccessFailure: false,
    didRemoveUserFromRoom: false,
    inRoom: true
  },
  {
    name: 'Authed user in private room, access denied, should be removed from room',
    hasPolicyDelegate: true,
    recentSuccess: { X: false, Y: false },
    expectRecordSuccessfulCheck: false,
    membersPolicy: 'X',
    adminPolicy: 'Y',
    expectedPolicy1: 'X',
    expectedPolicyResult1: false,
    expectedPolicy2: 'Y',
    expectedPolicyResult2: false,
    public: false,
    read: false,
    handleReadAccessFailure: true,
    removeUserFromRoom: true,
    inRoom: true
  },
  {
    name: 'An org admin cannot access an INVITE only room',
    inRoom: false,
    membersPolicy: 'INVITE',
    adminPolicy: 'X',
    hasPolicyDelegate: true,
    isInExtraMembers: false,
    isInExtraAdmins: false,
    expectedPolicy1: 'X',
    expectedPolicyResult1: true,
    read: false,
    write: false,
    join: false,
    admin: false,
    addUser: false,
    handleReadAccessFailure: true
  },
  {
    name: 'An org admin in an INVITE only room is an admin of the room',
    inRoom: true,
    hasPolicyDelegate: true,
    recentSuccess: { X: false },
    expectRecordSuccessfulCheck: true,
    membersPolicy: 'INVITE',
    adminPolicy: 'X',
    isInExtraMembers: false,
    isInExtraAdmins: false,
    expectedPolicy1: 'X',
    expectedPolicyResult1: true,
    read: true,
    write: true,
    join: true,
    admin: true,
    addUser: true
  },
  {
    name: 'An non-org-admin in an INVITE only room is not an admin of the room',
    inRoom: true,
    hasPolicyDelegate: true,
    recentSuccess: { X: false },
    membersPolicy: 'INVITE',
    adminPolicy: 'X',
    isInExtraMembers: false,
    isInExtraAdmins: false,
    expectedPolicy1: 'X',
    expectedPolicyResult1: false,
    read: true,
    write: true,
    join: true,
    admin: false,
    addUser: true
  },
  {
    name: 'User for INVITE_OR_ADMIN room, in room, not admin',
    inRoom: true,
    hasPolicyDelegate: true,
    recentSuccess: { X: false },
    membersPolicy: 'INVITE_OR_ADMIN',
    adminPolicy: 'X',
    isInExtraMembers: false,
    isInExtraAdmins: false,
    expectedPolicy1: 'X',
    expectedPolicyResult1: false,
    read: true,
    write: true,
    join: true,
    admin: false,
    addUser: true
  },
  {
    name: 'User for INVITE_OR_ADMIN room, not in room, not admin',
    inRoom: false,
    hasPolicyDelegate: true,
    recentSuccess: { X: false },
    membersPolicy: 'INVITE_OR_ADMIN',
    adminPolicy: 'X',
    isInExtraMembers: false,
    isInExtraAdmins: false,
    expectedPolicy1: 'X',
    expectedPolicyResult1: false,
    read: false,
    write: false,
    join: false,
    admin: false,
    addUser: false,
    handleReadAccessFailure: true
  },
  {
    name: 'User for INVITE_OR_ADMIN room, not in room, is admin',
    inRoom: false,
    hasPolicyDelegate: true,
    recentSuccess: { X: false },
    membersPolicy: 'INVITE_OR_ADMIN',
    adminPolicy: 'X',
    isInExtraMembers: false,
    isInExtraAdmins: false,
    expectedPolicy1: 'X',
    expectedPolicyResult1: true,
    read: true,
    write: true,
    join: true,
    admin: true,
    addUser: true,
    expectRecordSuccessfulCheck: true
  },
  {
    name: 'User for PUBLIC room with required provider',
    public: true,
    roomProviders: ['github'],
    userProviders: ['github'],
    inRoom: false,
    read: true,
    write: true,
    join: true,
    admin: false,
    addUser: true
  },
  {
    name: 'User for PUBLIC room without required provider',
    public: true,
    roomProviders: ['github'],
    userProviders: ['gitlab'],
    inRoom: false,
    read: true,
    write: false,
    join: false,
    admin: false,
    addUser: false
  },
  {
    name: 'Admin for PUBLIC room without required provider',
    public: true,
    roomProviders: ['github'],
    userProviders: ['gitlab'],
    inRoom: true,
    isInExtraAdmins: true,
    read: true,
    write: true,
    join: true,
    admin: true,
    addUser: true
  }
];

describe('create-base-policy', function() {
  // All the attributes:
  // name: String,
  // hasPolicyDelegate: true,
  // recentSuccess: {POLICY_NAME: true},
  // expectRecordSuccessfulCheck: false,
  // inRoom: false,
  // membersPolicy: undefined,
  // adminPolicy: undefined,
  // isInExtraMembers: false,
  // isInExtraAdmins: false,
  // expectedPolicy1: undefined,
  // expectedPolicyResult1: undefined,
  // expectedPolicy2: undefined,
  // expectedPolicyResult2: undefined,
  // read: true,
  // write: true,
  // join: true,
  // admin: false,
  // addUser: true
  FIXTURES.forEach(function(meta, index) {
    var name = getName(meta, index);
    /* eslint complexity: ["error", 13] */
    it(name, function() {
      var stubRateLimiter = {
        checkForRecentSuccess: async function(rateLimitKey) {
          if (meta.recentSuccess && meta.recentSuccess.hasOwnProperty(rateLimitKey)) {
            return meta.recentSuccess[rateLimitKey];
          }
          assert.ok(false, 'Unexpected call to checkForRecentSuccess');
        },
        recordSuccessfulCheck: async function() {
          this.recordSuccessfulCheckCount++;
          if (!meta.expectRecordSuccessfulCheck) {
            assert.ok(false, 'Unexpected call to recordSuccessfulCheck');
          }
        },
        recordSuccessfulCheckCount: 0
      };

      var didCallHandleReadAccessFailure = 0;
      var didRemoveUserFromRoom = false;

      var userId = meta.anonymous ? null : new ObjectID(1);

      let stubUserLoaderFactory = {};
      let stubIdentityService = {};

      // if securityDescriptor specifies providers, base policy is going to be checking them for user
      if (meta.roomProviders || meta.userProviders) {
        const fixtureUser = { _id: userId };
        stubUserLoaderFactory = id => async () =>
          id === fixtureUser._id ? fixtureUser : undefined;
        stubIdentityService = {
          listProvidersForUser: async user => (user === fixtureUser ? meta.userProviders : [])
        };
      }
      var createBasePolicy = proxyquireNoCallThru('../../lib/policies/create-base-policy', {
        './policy-check-rate-limiter': stubRateLimiter,
        'gitter-web-identity': stubIdentityService,
        '../user-loader-factory': stubUserLoaderFactory
      });

      var contextDelegate;

      // Only real users have a context delegate
      if (userId) {
        contextDelegate = {
          isMember: async function() {
            return meta.inRoom;
          },

          handleReadAccessFailure: async function() {
            assert(meta.handleReadAccessFailure, 'Unexpected call to handleReadAccessFailure');
            didCallHandleReadAccessFailure++;
            if (meta.inRoom) {
              didRemoveUserFromRoom = true;
            }
          }
        };
      }

      var securityDescriptor = {
        members: meta.membersPolicy,
        admins: meta.adminPolicy,
        public: meta.public,
        providers: meta.roomProviders
      };

      if (meta.isInExtraMembers) {
        assert(userId, 'Fixture broken');
        securityDescriptor.extraMembers = [userId];
      }

      if (meta.isInExtraAdmins) {
        assert(userId, 'Fixture broken');
        securityDescriptor.extraAdmins = [userId];
      }

      var policyDelegate;
      if (meta.hasPolicyDelegate) {
        policyDelegate = {
          hasPolicy: async function(policyName) {
            assert(policyName);

            if (meta.expectedPolicy1 === policyName) {
              if (meta.expectedPolicyResult1 === 'throw') {
                throw new PolicyDelegateTransportError();
              }
              return meta.expectedPolicyResult1;
            }

            if (meta.expectedPolicy2 === policyName) {
              if (meta.expectedPolicyResult2 === 'throw') {
                throw new PolicyDelegateTransportError();
              }

              return meta.expectedPolicyResult2;
            }

            assert.ok(false, 'Unexpected policy: ' + policyName);
          },

          getPolicyRateLimitKey: function(policyName) {
            return policyName;
          },

          getAccessDetails: function() {
            return null;
          }
        };
      }

      const basePolicy = createBasePolicy(
        userId,
        null,
        securityDescriptor,
        policyDelegate,
        contextDelegate
      );

      return Promise.all([
        meta.read !== undefined && basePolicy.canRead(),
        meta.write !== undefined && basePolicy.canWrite(),
        meta.join !== undefined && basePolicy.canJoin(),
        meta.admin !== undefined && basePolicy.canAdmin(),
        meta.addUser !== undefined && basePolicy.canAddUser()
      ]).then(function([read, write, join, admin, addUser]) {
        var expected = {};
        var results = {};
        if (meta.read !== undefined) {
          expected.read = meta.read;
          results.read = read;
        }
        if (meta.write !== undefined) {
          expected.write = meta.write;
          results.write = write;
        }
        if (meta.join !== undefined) {
          expected.join = meta.join;
          results.join = join;
        }
        if (meta.admin !== undefined) {
          expected.admin = meta.admin;
          results.admin = admin;
        }
        if (meta.addUser !== undefined) {
          expected.addUser = meta.addUser;
          results.addUser = addUser;
        }

        assert.deepEqual(results, expected);

        if (meta.expectRecordSuccessfulCheck) {
          assert(stubRateLimiter.recordSuccessfulCheckCount > 0);
        }

        if (meta.handleReadAccessFailure) {
          assert(didCallHandleReadAccessFailure > 0);
        }

        assert.strictEqual(didRemoveUserFromRoom, !!meta.removeUserFromRoom);
      });
    });
  });
});
