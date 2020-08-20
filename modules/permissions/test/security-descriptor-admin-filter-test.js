'use strict';

var proxyquireNoCallThru = require('proxyquire').noCallThru();
var Promise = require('bluebird');
var assert = require('assert');

describe('security-descriptor-admin-filter', function() {
  var FIXTURE_USER = {
    _id: 1
  };

  var DESCRIPTOR_1 = {
    _id: 2,
    sd: {}
  };

  var DESCRIPTOR_2 = {
    _id: 3,
    sd: {}
  };

  var FIXTURES = [
    {
      name: 'should handle empty arrays',
      user: FIXTURE_USER,
      input: [],
      expected: []
    },
    {
      name: 'should handle anonymous users',
      user: null,
      input: [DESCRIPTOR_1, DESCRIPTOR_2],
      expected: []
    },
    {
      name: 'should filter all if the user is an admin of none',
      user: FIXTURE_USER,
      input: [DESCRIPTOR_1, DESCRIPTOR_2],
      responses: {
        1: false,
        2: false
      },
      expected: []
    },
    {
      name: 'should filter partial if the user is an admin of some',
      user: FIXTURE_USER,
      input: [DESCRIPTOR_1, DESCRIPTOR_2],
      responses: {
        1: true,
        2: false
      },
      expected: [DESCRIPTOR_1]
    },
    {
      name: 'should filter all if the user is an admin of all',
      user: FIXTURE_USER,
      input: [DESCRIPTOR_1, DESCRIPTOR_2],
      responses: {
        1: true,
        2: true
      },
      expected: [DESCRIPTOR_1, DESCRIPTOR_2]
    }
  ];

  FIXTURES.forEach(function(META) {
    it(META.name, function() {
      var mockPolicyDelegate = {};

      var securityDescriptorAdminFilter = proxyquireNoCallThru(
        '../lib/security-descriptor-admin-filter',
        {
          './policies/create-base-policy': function(
            userId,
            user,
            securityDescriptor,
            policyDelegate,
            contextDelegate
          ) {
            assert.strictEqual(userId, META.user._id);
            assert.strictEqual(user, META.user);
            assert.ok(securityDescriptor);
            assert.strictEqual(policyDelegate, mockPolicyDelegate);
            assert.strictEqual(contextDelegate, null);
            return {
              canAdmin: function() {
                if (!META.responses || !META.responses) {
                  assert.ok(false, 'Unexpected call');
                }
                var index;
                if (securityDescriptor === DESCRIPTOR_1.sd) {
                  index = 1;
                } else if (securityDescriptor === DESCRIPTOR_2.sd) {
                  index = 2;
                }

                if (!META.responses.hasOwnProperty(index)) {
                  assert.ok(false, 'No response in fixture');
                }

                return Promise.resolve(META.responses[index]);
              }
            };
          },
          './policy-delegate-factory': function(pUserId, pUserLoader, pSecurityDescriptor) {
            assert.strictEqual(pUserId, META.user._id);
            assert.strictEqual(typeof pUserLoader, 'function');
            assert(
              pSecurityDescriptor === DESCRIPTOR_2.sd || pSecurityDescriptor === DESCRIPTOR_1.sd
            );
            return mockPolicyDelegate;
          }
        }
      );

      return securityDescriptorAdminFilter(META.user, META.input).then(function(result) {
        assert.deepEqual(result, META.expected);
      });
    });
  });
});
