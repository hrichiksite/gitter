'use strict';

var Promise = require('bluebird');
var assert = require('assert');
var StatusError = require('statuserror');
var inviteValidation = require('../lib/invite-validation');
var proxyquireNoCallThru = require('proxyquire').noCallThru();

describe('parseAndValidateInput', function() {
  describe('maskEmail', function() {
    var maskEmail = inviteValidation.maskEmail;

    it('should mask the part to the left of the @', function() {
      // strips the last (up to) 8 chars, replaces it will 4 *
      assert.strictEqual(maskEmail('lerouxb@gmail.com'), '****@gmail.com');
      assert.strictEqual(maskEmail('mike.bartlett@gmail.com'), 'mike.****@gmail.com');
    });

    it('should mask the part to the left of the +', function() {
      // does the same as above, except to the left of + rather than @
      assert.strictEqual(maskEmail('lerouxb+gitter@gmail.com'), '****@gmail.com');
      assert.strictEqual(maskEmail('mike.bartlett+gitter@gmail.com'), 'mike.****@gmail.com');
    });
  });

  describe('getAvatar', function() {
    var getAvatar = proxyquireNoCallThru('../lib/invite-validation', {
      // Just mock these out to make things synchronous as it just maps out to
      // the avatars service anyway and that kind of thing should get tested in
      // that module.
      'gitter-web-avatars': {
        getForGitHubUsername: function(username) {
          return "getForGitHubUsername('" + username + "')";
        },
        getForGravatarEmail: function(email) {
          return "getForGravatarEmail('" + email + "')";
        },
        getDefault: function() {
          return 'getDefault()';
        }
      }
    }).getAvatar;

    it('should return an avatar for a github username', function() {
      assert.strictEqual(getAvatar('github', 'lerouxb'), "getForGitHubUsername('lerouxb')");
    });

    it('should return a gravatar for an email address', function() {
      assert.strictEqual(
        getAvatar('twitter', '__leroux', 'lerouxb@gmail.com'),
        "getForGravatarEmail('lerouxb@gmail.com')"
      );
    });

    it("should return the default avatar if it isn't a github username or email address", function() {
      assert.strictEqual(getAvatar('twitter', '__leroux'), 'getDefault()');
    });

    it('should return a gravatar for an email address', function() {
      assert.strictEqual(
        getAvatar('gitlab', 'MadLittleMods', 'contact@ericeastwood.com'),
        "getForGravatarEmail('contact@ericeastwood.com')"
      );
    });

    it("should return the default avatar if it isn't a github username or email address", function() {
      assert.strictEqual(getAvatar('gitlab', 'MadLittleMods'), 'getDefault()');
    });
  });

  describe('parseAndValidateInput', function() {
    var parseAndValidateInput = inviteValidation.parseAndValidateInput;

    describe('old method', function() {
      it('should throw a 400 statuserror if no valid params are passed in', function() {
        return Promise.try(function() {
          return parseAndValidateInput({ foo: 'bar' });
        })
          .then(function() {
            assert.ok(false, 'Expected error.');
          })
          .catch(StatusError, function(err) {
            assert.strictEqual(err.status, 400);
          });
      });

      it('should throw a 400 statuserror if a non-string value is passed in', function() {
        return Promise.try(function() {
          return parseAndValidateInput({ username: 1 });
        })
          .then(function() {
            assert.ok(false, 'Expected error.');
          })
          .catch(StatusError, function(err) {
            assert.strictEqual(err.status, 400);
          });
      });

      it('should throw a 400 statuserror if multiple usernames are passed in', function() {
        return Promise.try(function() {
          return parseAndValidateInput({ username: 'gitter', githubUsername: 'github' });
        })
          .then(function() {
            assert.ok(false, 'Expected error.');
          })
          .catch(StatusError, function(err) {
            assert.strictEqual(err.status, 400);
          });
      });

      it('should return type gitter if username was passed in', function() {
        var result = parseAndValidateInput({ username: 'gitter' });
        assert.deepStrictEqual(result, {
          type: 'gitter',
          externalId: 'gitter',
          emailAddress: undefined
        });
      });

      it('should return type github if githubUsername was passed in', function() {
        var result = parseAndValidateInput({ githubUsername: 'github' });
        assert.deepStrictEqual(result, {
          type: 'github',
          externalId: 'github',
          emailAddress: undefined
        });
      });

      it('should return type twitter if twitterUsername was passed in', function() {
        var result = parseAndValidateInput({ twitterUsername: 'twitter' });
        assert.deepStrictEqual(result, {
          type: 'twitter',
          externalId: 'twitter',
          emailAddress: undefined
        });
      });

      it('should return the email address if one was passed in with a username', function() {
        var result = parseAndValidateInput({
          twitterUsername: '__leroux',
          email: 'lerouxb@gmail.com'
        });
        assert.deepStrictEqual(result, {
          type: 'twitter',
          externalId: '__leroux',
          emailAddress: 'lerouxb@gmail.com'
        });
      });

      it('should return type gitlab if gitlabUsername was passed in', function() {
        var result = parseAndValidateInput({ gitlabUsername: 'MadLittleMods' });
        assert.deepStrictEqual(result, {
          type: 'gitlab',
          externalId: 'MadLittleMods',
          emailAddress: undefined
        });
      });

      it('should return the email address if one was passed in with a username', function() {
        var result = parseAndValidateInput({
          gitlabUsername: 'MadLittleMods',
          email: 'contact@ericeastwood.com'
        });
        assert.deepStrictEqual(result, {
          type: 'gitlab',
          externalId: 'MadLittleMods',
          emailAddress: 'contact@ericeastwood.com'
        });
      });
    });

    describe('new method', function() {
      it('should parse gitter invites', function() {
        var invite = parseAndValidateInput({ type: 'gitter', externalId: 'suprememoocow' });
        assert.deepEqual(invite, {
          emailAddress: undefined,
          externalId: 'suprememoocow',
          type: 'gitter'
        });
      });

      it('should parse github invites', function() {
        var invite = parseAndValidateInput({ type: 'github', externalId: 'suprememoocow' });
        assert.deepEqual(invite, {
          emailAddress: undefined,
          externalId: 'suprememoocow',
          type: 'github'
        });
      });

      it('should parse twitter invites', function() {
        var invite = parseAndValidateInput({ type: 'twitter', externalId: 'suprememoocow' });
        assert.deepEqual(invite, {
          emailAddress: undefined,
          externalId: 'suprememoocow',
          type: 'twitter'
        });
      });

      it('should parse gitlab invites', function() {
        var invite = parseAndValidateInput({ type: 'gitlab', externalId: 'MadLittleMods' });
        assert.deepEqual(invite, {
          emailAddress: undefined,
          externalId: 'MadLittleMods',
          type: 'gitlab'
        });
      });

      it('should throw a 400 statuserror if an externalId is not supplied', function() {
        return Promise.try(function() {
          return parseAndValidateInput({ type: 'gitter' });
        })
          .then(function() {
            assert.ok(false, 'Expected error.');
          })
          .catch(StatusError, function(err) {
            assert.strictEqual(err.status, 400);
          });
      });

      it('should throw a 400 statuserror if an invalid type is supplied', function() {
        return Promise.try(function() {
          return parseAndValidateInput({ type: 'wombat', externalId: 'wombatz' });
        })
          .then(function() {
            assert.ok(false, 'Expected error.');
          })
          .catch(StatusError, function(err) {
            assert.strictEqual(err.status, 400);
          });
      });
    });
  });
});
