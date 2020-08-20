'use strict';

var assert = require('assert');
var testRequire = require('../../test-require');
var userCanJoinRoom = testRequire('../shared/rooms/user-can-join-room');

var GITHUB_ONLY = ['github'];

describe('user-can-join-room', function() {
  it('should allow github users to join open rooms', function() {
    assert.equal(userCanJoinRoom(['github'], null), true);
    assert.equal(userCanJoinRoom(['github'], undefined), true);
    assert.equal(userCanJoinRoom(['github'], []), true);
  });

  it('should allow github users to join github-only rooms', function() {
    assert.equal(userCanJoinRoom(['github'], GITHUB_ONLY), true);
  });

  it('should allow GitLab users to join open rooms', function() {
    assert.equal(userCanJoinRoom(['gitlab'], null), true);
    assert.equal(userCanJoinRoom(['gitlab'], undefined), true);
    assert.equal(userCanJoinRoom(['gitlab'], []), true);
  });

  it('should allow twitter users to join open rooms', function() {
    assert.equal(userCanJoinRoom(['twitter'], null), true);
    assert.equal(userCanJoinRoom(['twitter'], undefined), true);
    assert.equal(userCanJoinRoom(['twitter'], []), true);
  });

  it('should not allow twitter users to join github-only rooms', function() {
    assert.equal(userCanJoinRoom(['twitter'], GITHUB_ONLY), false);
  });

  it('should not allow GitLab users to join github-only rooms', function() {
    assert.equal(userCanJoinRoom(['gitlab'], GITHUB_ONLY), false);
  });

  it('should allow users with multiple identities to join if at least one is allowed', function() {
    assert.equal(userCanJoinRoom(['github', 'twitter'], null), true);
    assert.equal(userCanJoinRoom(['github', 'twitter'], undefined), true);
    assert.equal(userCanJoinRoom(['github', 'twitter'], []), true);
    assert.equal(userCanJoinRoom(['github', 'twitter'], GITHUB_ONLY), true);
  });

  it('should not allow users with multiple identities to join if none are allowed', function() {
    assert.equal(userCanJoinRoom(['twitter', 'linkedin'], ['github', 'google']), false);
    assert.equal(userCanJoinRoom(['twitter', 'linkedin'], GITHUB_ONLY), false);
  });
});
