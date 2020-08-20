'use strict';

var testRequire = require('./test-require');

var restSerializer = testRequire('./serializers/rest-serializer');

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('restSerializer', function() {
  var blockTimer = require('gitter-web-test-utils/lib/block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setup({
    user1: {},
    troupe1: { users: ['user1'] }
  });

  describe('#UserStrategy()', function() {
    it('should serialize a user ', function() {
      var users = [fixture.user1];
      var userStrategy = new restSerializer.UserStrategy();

      return restSerializer.serialize(users, userStrategy).then(function(serialized) {
        assert(serialized);
      });
    });

    it('should return the correct display name', function() {
      var userStrategy = new restSerializer.UserStrategy();
      var mappedUser = userStrategy.map(fixture.user1);
      assert.equal(mappedUser.displayName, fixture.user1.displayName);
    });

    it('should return when no items are serialized with promises', function() {
      var userStrategy = new restSerializer.UserStrategy();

      return restSerializer.serialize([], userStrategy).then(function(results) {
        assert.deepEqual(results, []);
      });
    });

    it('should return when a null item is serialized with promises', function() {
      var userStrategy = new restSerializer.UserStrategy();

      return restSerializer.serialize(null, userStrategy).then(function(results) {
        assert.strictEqual(results, null);
      });
    });
  });
});
