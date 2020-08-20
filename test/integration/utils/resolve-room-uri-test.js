'use strict';

var testRequire = require('../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var resolveRoomUri = testRequire('./utils/resolve-room-uri');
var assert = require('assert');
var StatusError = require('statuserror');

describe('resolve-room-uri', function() {
  describe('integration tests #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      user3: {},
      troupe1: {},
      troupe2: {
        oneToOne: true,
        users: ['user1', 'user2']
      }
    });

    var TESTS = [
      { name: 'anonymous w/ group room', user: null, room: 'troupe1', uri: 'troupe1' },
      { name: 'user w/ group room', user: 'user1', room: 'troupe1', uri: 'troupe1' },
      { name: 'one-to-one, first user', user: 'user1', room: 'troupe2', uri: 'user2' },
      { name: 'one-to-one, 2nd user', user: 'user2', room: 'troupe2', uri: 'user1' },
      { name: 'one-to-one, non member', user: 'user3', room: 'troupe2', error: true },
      { name: 'one-to-one, anonymous', user: null, room: 'troupe2', error: true }
    ];

    TESTS.forEach(function(META) {
      it(META.name, function() {
        var user = fixture[META.user];
        var room = fixture[META.room];

        var expectedUri;

        if (!META.error) {
          var o = fixture[META.uri];
          expectedUri = '/' + (o.uri || o.username);
        }

        return resolveRoomUri(room, user && user.id)
          .then(function(uri) {
            if (META.error) {
              assert.ok(false, 'Expected exception');
            }
            assert.strictEqual(uri, expectedUri);
          })
          .catch(StatusError, function(err) {
            if (!META.error) {
              assert.ok(false, 'Expected no exception');
            }

            assert.strictEqual(err.status, 404);
          });
      });
    });
  });
});
