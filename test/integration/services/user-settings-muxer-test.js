'use strict';

var testRequire = require('./../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var userSettingsMuxer = testRequire('./services/user-settings-muxer');
var assert = testRequire('assert');

describe('user-settings-muxer', function() {
  describe('#slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {}
    });

    describe('getSetting', function() {
      it('should handle null values', function() {
        var user2 = fixture.user2;
        assert(user2);
        return userSettingsMuxer.getSetting(user2, 'lang').then(function(result) {
          assert.deepEqual(result, {});
        });
      });
    });

    describe('getSettings', function() {
      it('should handle multiple values', function() {
        var user2 = fixture.user2;
        assert(user2);
        return userSettingsMuxer
          .getSettings(user2, ['lang', 'defaultRoomMode'])
          .then(function(result) {
            assert.strictEqual(result.lang, undefined);
            assert(result.defaultRoomMode);
            assert(result.defaultRoomMode.mode);
          });
      });
    });

    describe('updateSetting', function() {
      it('should handle updates', function() {
        var user1 = fixture.user1;
        assert(user1);
        return userSettingsMuxer.updateSetting(user1, 'lang', 'en').then(function(result) {
          assert.deepEqual(result, 'en');
        });
      });
    });

    describe('updateSettings', function() {
      it('should handle updates', function() {
        var user1 = fixture.user1;
        assert(user1);
        return userSettingsMuxer
          .updateSettings(user1, {
            lang: 'fr',
            defaultRoomMode: { mode: 'all' },
            leftRoomMenu: { a: 1 },
            unread_notifications_optout: true
          })
          .then(function(result) {
            assert.strictEqual(result.lang, 'fr');
            assert.strictEqual(result.defaultRoomMode.mode, 'all');
            assert.deepEqual(result.leftRoomMenu, { a: 1 });
            assert.strictEqual(result.unread_notifications_optout, true);

            return userSettingsMuxer.getSettings(user1, [
              'lang',
              'defaultRoomMode',
              'leftRoomMenu',
              'unread_notifications_optout'
            ]);
          })
          .then(function(result) {
            assert.strictEqual(result.lang, 'fr');
            assert.strictEqual(result.defaultRoomMode.mode, 'all');
            assert.deepEqual(result.leftRoomMenu, { a: 1 });
            assert.strictEqual(result.unread_notifications_optout, true);
          });
      });

      it('should not blat existing settings', function() {
        var user1 = fixture.user1;
        assert(user1);
        return userSettingsMuxer
          .updateSettings(user1, {
            lang: 'gr',
            leftRoomMenu: { a: 2 }
          })
          .then(function() {
            return userSettingsMuxer.updateSettings(user1, { lang: 'de' });
          })
          .then(function() {
            return userSettingsMuxer.getSettings(user1, ['lang', 'leftRoomMenu']);
          })
          .then(function(result) {
            assert.deepEqual(result, {
              lang: 'de',
              leftRoomMenu: { a: 2 }
            });
          });
      });
    });
  });
});
