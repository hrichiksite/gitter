'use strict';

var testRequire = require('../test-require');
var assert = require('assert');

var loginUtils = testRequire('./web/login-utils');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('login-utils', function() {
  var fixture = fixtureLoader.setup({
    troupe1: { users: 'user1', lastAccessTime: false },
    user3: { username: true }
  });

  describe('#whereToNext', function(done) {
    it('should return a username url if the user is in not in any troupes and has no username', function() {
      return loginUtils
        .whereToNext(fixture.user3)
        .then(function(url) {
          assert(url.indexOf(fixture.user3.username) === 1, 'URL should contain username');
          assert.equal(url, '/' + fixture.user3.username);
        })
        .nodeify(done);
    });

    it('should return a troupe if the user is a member', function() {
      return loginUtils
        .whereToNext(fixture.user1)
        .then(function(url) {
          assert.equal(url, '/' + fixture.user1.username);
        })
        .nodeify(done);
    });
  });
});
