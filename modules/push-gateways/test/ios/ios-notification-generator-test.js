'use strict';

var iosNotificationGenerator = require('../../lib/ios/ios-notification-generator');
var fixtures = require('../fixtures');
var assert = require('assert');

describe('ios-notification-generator', function() {
  it('should handle new_chat notifications in group rooms', function() {
    var result = iosNotificationGenerator('new_chat', fixtures.NEW_CHAT_GROUP_ROOM, null);

    assert.strictEqual(result.alert, 'troupe  \nAndrew Newdigate: HELLO  \nHELLOOOOOO');

    assert.deepEqual(result.payload, {
      aps: {
        'content-available': 1,
        l: '/mobile/chat#5819c1e9769b5c3bc2966d5b'
      }
    });
  });

  it('should handle new_chat notifications in one-to-one rooms', function() {
    var result = iosNotificationGenerator('new_chat', fixtures.NEW_CHAT_ONE_TO_ONE_ROOM, null);

    assert.strictEqual(result.alert, 'gittertestbot  \nhello  \nmooo');

    assert.deepEqual(result.payload, {
      aps: {
        'content-available': 1,
        l: '/mobile/chat#5819cade769b5c3bc2966db6'
      }
    });
  });
});
