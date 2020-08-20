'use strict';

var proxyquireNoCallThru = require('proxyquire').noCallThru();
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var Promise = require('bluebird');

describe('group-resolver', function() {
  describe('#slow', function() {
    var groupResolver;
    var adminPermission;

    var fixture = fixtureLoader.setup({
      user1: {},
      troupe1: { users: ['user1'] }
    });

    beforeEach(function() {
      var createPolicyForRoom = function() {
        return Promise.resolve({
          canAdmin: function() {
            return Promise.resolve(adminPermission);
          }
        });
      };

      groupResolver = proxyquireNoCallThru('../lib/group-resolver', {
        'gitter-web-permissions/lib/policy-factory': {
          createPolicyForRoom: createPolicyForRoom
        }
      });
    });

    it('should resolve @/all mentions for admins', function() {
      var troupe = fixture.troupe1;
      var user1 = fixture.user1;
      adminPermission = true;

      return groupResolver(troupe, user1, ['all']).then(function(result) {
        assert.strictEqual(result.all.announcement, true);
      });
    });

    it('should resolve not resolve mentions for non-admins', function() {
      var troupe = fixture.troupe1;
      var user1 = fixture.user1;
      adminPermission = false;

      return groupResolver(troupe, user1, ['all']).then(function(result) {
        assert(!result.all);
      });
    });
  });
});
