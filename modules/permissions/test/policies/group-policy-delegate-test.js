'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var proxyquireNoCallThru = require('proxyquire').noCallThru();
var ObjectID = require('mongodb').ObjectID;

describe('group-policy-delegate', function() {
  var USER = { _id: 1, username: 'x' };
  var GROUP_ID = new ObjectID();

  var FIXTURES = [
    {
      name: 'is group admin',
      groupId: GROUP_ID,
      user: USER,
      isGroupAdmin: true,
      policy: 'GROUP_ADMIN',
      expectedResult: true
    },
    {
      name: 'is not group admin',
      groupId: GROUP_ID,
      user: USER,
      isGroupAdmin: false,
      policy: 'GROUP_ADMIN',
      expectedResult: false
    },
    {
      name: 'anonymous',
      groupId: GROUP_ID,
      user: null,
      isGroupAdmin: false,
      policy: 'GROUP_ADMIN',
      expectedResult: false
    },
    {
      name: 'invalid policy, non-anon',
      groupId: GROUP_ID,
      user: USER,
      isGroupAdmin: true,
      policy: 'INVALID',
      expectedResult: false
    },
    {
      name: 'invalid policy, anon',
      groupId: GROUP_ID,
      user: null,
      isGroupAdmin: false,
      policy: 'INVALID',
      expectedResult: false
    }
  ];

  FIXTURES.forEach(function(meta) {
    it(meta.name, function() {
      var securityDescriptor = {
        internalId: meta.groupId
      };

      var user = meta.user;
      var userId = user && user._id;

      function userLoader() {
        return Promise.resolve(user);
      }

      var GroupPolicyDelegate = proxyquireNoCallThru('../../lib/policies/group-policy-delegate', {
        '../policy-factory': {
          createPolicyForGroupIdWithUserLoader: Promise.method(function(
            pUserId,
            pUserLoader,
            pGroupId
          ) {
            assert.strictEqual(pGroupId, meta.groupId);
            assert.strictEqual(pUserId, userId);
            assert.strictEqual(pUserLoader, userLoader);

            return {
              canAdmin: Promise.method(function() {
                return meta.isGroupAdmin;
              })
            };
          })
        }
      });

      var delegate = new GroupPolicyDelegate(userId, userLoader, securityDescriptor);

      return delegate.hasPolicy(meta.policy).then(
        function(result) {
          if (meta.expectedResult === 'throw') {
            assert.ok(false, 'Expected exception');
          }
          assert.strictEqual(result, meta.expectedResult);
        },
        function(err) {
          if (meta.expectedResult !== 'throw') {
            throw err;
          }
        }
      );
    });
  });
});
