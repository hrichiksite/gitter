'use strict';

var vapidNotificationGenerator = require('../../lib/vapid/vapid-notification-generator');
var fixtures = require('../fixtures');
var assert = require('assert');

describe('vapid-notification-generator', function() {
  it('should handle new_chat notifications in group rooms', function() {
    var result = vapidNotificationGenerator('new_chat', fixtures.NEW_CHAT_GROUP_ROOM, null);
    assert.deepEqual(result, {
      type: 'new_chat',
      linkUrl: '/troupe?utm_source=web-push-notification',
      room: {
        id: '5819c1e9769b5c3bc2966d5b',
        name: 'troupe',
        oneToOne: false,
        uri: 'troupe',
        url: '/troupe'
      },
      chats: [
        {
          id: '5819ccea39ebecd7594f8ad7',
          text: 'HELLO',
          sent: '2016-11-02T11:24:26.219Z',
          fromUser: {
            id: '5818bc0f769b5c3bc2966906',
            username: 'suprememoocow',
            displayName: 'Andrew Newdigate',
            avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow'
          }
        },
        {
          id: '581b359941d3edac30ecd937',
          text: 'HELLOOOOOO',
          sent: '2016-11-03T13:03:21.563Z',
          fromUser: {
            id: '5818bc0f769b5c3bc2966906',
            username: 'suprememoocow',
            displayName: 'Andrew Newdigate',
            avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow'
          }
        }
      ]
    });
  });

  it('should handle new_chat notifications in one-to-one rooms', function() {
    var result = vapidNotificationGenerator('new_chat', fixtures.NEW_CHAT_ONE_TO_ONE_ROOM, null);

    assert.deepEqual(result, {
      type: 'new_chat',
      linkUrl: '/gittertestbot?utm_source=web-push-notification',
      room: {
        id: '5819cade769b5c3bc2966db6',
        name: 'gittertestbot',
        oneToOne: true,
        uri: undefined,
        url: '/gittertestbot'
      },
      chats: [
        {
          id: '581b133f15c1380612d03a91',
          text: 'hello',
          sent: '2016-11-03T10:36:47.004Z',
          fromUser: {
            id: '5818bc0f769b5c3bc2966906',
            username: 'suprememoocow',
            displayName: 'Andrew Newdigate',
            avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow'
          }
        },
        {
          id: '581b135e15c1380612d03ab2',
          text: 'mooo',
          sent: '2016-11-03T10:37:18.777Z',
          fromUser: {
            id: '5818bc0f769b5c3bc2966906',
            username: 'suprememoocow',
            displayName: 'Andrew Newdigate',
            avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow'
          }
        }
      ]
    });
  });
});
