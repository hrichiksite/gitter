'use strict';

var androidNotificationGenerator = require('../../lib/android/android-notification-generator');
var fixtures = require('../fixtures');
var assert = require('assert');

describe('android-notification-generator', function() {
  it('should handle new_chat notifications in group rooms', function() {
    var result = androidNotificationGenerator('new_chat', fixtures.NEW_CHAT_GROUP_ROOM, null);
    assert.deepEqual(result.params.data, {
      id: '5819c1e9769b5c3bc2966d5b',
      name: 'troupe',
      message: 'troupe  \nAndrew Newdigate: HELLO  \nHELLOOOOOO'
    });
  });

  it('should handle new_chat notifications in one-to-one rooms', function() {
    var result = androidNotificationGenerator('new_chat', fixtures.NEW_CHAT_ONE_TO_ONE_ROOM, null);
    assert.deepEqual(result.params.data, {
      id: '5819cade769b5c3bc2966db6',
      name: 'gittertestbot',
      message: 'gittertestbot  \nhello  \nmooo'
    });
  });
});
