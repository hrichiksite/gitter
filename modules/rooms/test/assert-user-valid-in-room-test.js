'use strict';

var assert = require('assert');
var proxyquireNoCallThru = require('proxyquire').noCallThru();
var Promise = require('bluebird');

describe('assert-user-valid-in-room', function() {
  var gitlabUser = { providers: ['gitlab'] };
  var githubUser = { providers: ['github'] };
  var twitterUser = { providers: ['twitter'] };
  var githubRoom = {
    providers: ['github'],
    uri: 'foo/bar',
    githubType: 'REPO',
    security: 'PUBLIC'
  };
  var oneToOneRoom = { oneToOne: true, githubType: 'ONETOONE', security: 'PRIVATE' };

  var assertUserValidInRoom = proxyquireNoCallThru('../lib/assert-user-valid-in-room', {
    'gitter-web-identity': {
      listProvidersForUser: function(user) {
        return Promise.resolve(user.providers);
      }
    }
  });

  it('should not allow a user to join a github-only room if the user has a Twitter identity', function() {
    return assertUserValidInRoom(githubRoom, twitterUser).then(
      function() {
        assert.ok(false, 'Expected an exception');
      },
      function(err) {
        assert.strictEqual(err.status, 403);
      }
    );
  });

  it('should not allow a user to join a github-only room if the user has a GitLab identity', function() {
    return assertUserValidInRoom(githubRoom, gitlabUser).then(
      function() {
        assert.ok(false, 'Expected an exception');
      },
      function(err) {
        assert.strictEqual(err.status, 403);
      }
    );
  });

  it('should not allow a user who has not yet signed up to join a github-only room', function() {
    return assertUserValidInRoom(githubRoom, null).then(
      function() {
        assert.ok(false, 'Expected an exception');
      },
      function(err) {
        assert.strictEqual(err.status, 403);
      }
    );
  });

  it('should allow a user to join a github-only room if the user has a github identity', function() {
    return assertUserValidInRoom(githubRoom, githubUser);
  });

  it('should pass through one-to-one rooms too', function() {
    return assertUserValidInRoom(oneToOneRoom, twitterUser);
  });

  it('should pass through one-to-one rooms too', function() {
    return assertUserValidInRoom(oneToOneRoom, gitlabUser);
  });
});
