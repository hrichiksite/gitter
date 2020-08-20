'use strict';

var assert = require('assert');
var resolveUserAvatarUrl = require('gitter-web-shared/avatars/resolve-user-avatar-url');

describe('user avatar url generator', function() {
  describe('when passed a user object', function() {
    it('should return a github url for a github gravatarImageUrl', function() {
      var user = {
        username: 'lerouxb',
        gravatarImageUrl: 'https://avatars.githubusercontent.com/u/69737?v=3'
      };
      var result = resolveUserAvatarUrl(user, 40);
      assert.equal(result, 'https://avatars1.githubusercontent.com/u/69737?v=3&s=40');
    });

    it('should return a GitLab url for a GitLab gravatarImageUrl', function() {
      var user = {
        username: 'MadLittleMods',
        gravatarImageUrl:
          'https://secure.gravatar.com/avatar/4d634a2b818e2265fa2924b5f4c2da71?s=80&d=identicon'
      };
      var result = resolveUserAvatarUrl(user, 60);
      assert.equal(
        result,
        'https://secure.gravatar.com/avatar/4d634a2b818e2265fa2924b5f4c2da71?s=60&d=identicon'
      );
    });

    it('should return a GitLab url for a GitLab uploaded image', function() {
      var user = {
        username: 'EricTroupeTester',
        gravatarImageUrl: 'https://gitlab.com/uploads/-/system/user/avatar/1490805/avatar.png'
      };
      var result = resolveUserAvatarUrl(user, 60);
      assert.equal(
        result,
        'https://gitlab.com/uploads/-/system/user/avatar/1490805/avatar.png?s=60'
      );
    });

    it('should return a google url for a google gravatarImageUrl', function() {
      var user = {
        gravatarImageUrl:
          'https://lh5.googleusercontent.com/-8JzxZyD84qE/AAAAAAAAAAI/AAAAAAAAAN4/_x36v4AaxKo/photo.jpg'
      };
      var result = resolveUserAvatarUrl(user, 40);
      assert.equal(result, user.gravatarImageUrl + '?sz=40');
    });

    it('should return a twitter url for a twitter gravatarImageUrl', function() {
      var user = {
        gravatarImageUrl:
          'https://pbs.twimg.com/profile_images/378800000308609669/c5cc5261cc55da2dbca442eaf60920cc_normal.jpeg'
      };
      var result = resolveUserAvatarUrl(user, 60);
      assert.equal(
        result,
        'https://pbs.twimg.com/profile_images/378800000308609669/c5cc5261cc55da2dbca442eaf60920cc_bigger.jpeg'
      );
    });
  });

  describe('when passed a serialized user', function() {
    it('should return avatarUrl* when set', function() {
      var user = {
        avatarUrlSmall: 'https://avatars.githubusercontent.com/u/69737?v=3&s=60',
        avatarUrlMedium: 'https://avatars.githubusercontent.com/u/69737?v=3&s=128'
      };
      assert.equal(resolveUserAvatarUrl(user, 60), user.avatarUrlSmall);
      assert.equal(resolveUserAvatarUrl(user, 128), user.avatarUrlMedium);
    });

    it('should return a github url for github username and version', function() {
      var user = {
        username: 'whaaaaat',
        gv: '3'
      };
      var result = resolveUserAvatarUrl(user, 60);
      assert.equal(result, 'https://avatars0.githubusercontent.com/whaaaaat?v=3&s=60');
    });

    it('should return a resolver url for non-github username', function() {
      var user = {
        username: '1234_'
      };
      var result = resolveUserAvatarUrl(user, 60);
      assert.equal(result, '/api/private/user-avatar/1234_?s=60');
    });
  });
});
