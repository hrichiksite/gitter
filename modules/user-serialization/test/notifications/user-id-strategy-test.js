'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var UserIdStrategy = require('../../lib/notifications/user-id-strategy');
var serialize = require('gitter-web-serialization/lib/serialize');

describe('user-id-strategy', function() {
  describe('integration tests #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {}
    });

    it('should serialize userids', function() {
      var strategy = new UserIdStrategy();
      return serialize([fixture.user1._id], strategy).then(function(result) {
        assert.strictEqual(result.length, 1);
        var r0 = result[0];
        assert.strictEqual(r0.id, fixture.user1.id);
        assert.strictEqual(r0.username, fixture.user1.username);
        assert.strictEqual(r0.displayName, fixture.user1.displayName);
        assert(r0.avatarUrl);
        assert(r0.avatarUrlSmall); // Legacy
        assert(r0.avatarUrlMedium); // Legacy
      });
    });
  });
});
