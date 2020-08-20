'use strict';

var NEW_CHAT_GROUP_ROOM = {
  badgeCount: 0,
  chats: [
    {
      id: '5819ccea39ebecd7594f8ad7',
      text: 'HELLO',
      html: 'HELLO',
      sent: '2016-11-02T11:24:26.219Z',
      mentions: [],
      fromUser: {
        id: '5818bc0f769b5c3bc2966906',
        username: 'suprememoocow',
        displayName: 'Andrew Newdigate',
        avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow',
        avatarUrlSmall: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow?s=60',
        avatarUrlMedium: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow?s=128'
      }
    },
    {
      id: '581b359941d3edac30ecd937',
      text: 'HELLOOOOOO',
      html: 'HELLOOOOOO',
      sent: '2016-11-03T13:03:21.563Z',
      mentions: [],
      fromUser: {
        id: '5818bc0f769b5c3bc2966906',
        username: 'suprememoocow',
        displayName: 'Andrew Newdigate',
        avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow',
        avatarUrlSmall: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow?s=60',
        avatarUrlMedium: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow?s=128'
      }
    }
  ],
  room: {
    id: '5819c1e9769b5c3bc2966d5b',
    uri: 'troupe',
    oneToOne: false,
    url: '/troupe',
    urlUserMap: false,
    nameUserMap: false
  },
  hasMentions: false
};

var NEW_CHAT_ONE_TO_ONE_ROOM = {
  badgeCount: 0,
  chats: [
    {
      id: '581b133f15c1380612d03a91',
      text: 'hello',
      html: 'hello',
      sent: '2016-11-03T10:36:47.004Z',
      mentions: [],
      fromUser: {
        id: '5818bc0f769b5c3bc2966906',
        username: 'suprememoocow',
        displayName: 'Andrew Newdigate',
        avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow',
        avatarUrlSmall: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow?s=60',
        avatarUrlMedium: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow?s=128'
      }
    },
    {
      id: '581b135e15c1380612d03ab2',
      text: 'mooo',
      html: 'mooo',
      sent: '2016-11-03T10:37:18.777Z',
      mentions: [],
      fromUser: {
        id: '5818bc0f769b5c3bc2966906',
        username: 'suprememoocow',
        displayName: 'Andrew Newdigate',
        avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow',
        avatarUrlSmall: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow?s=60',
        avatarUrlMedium: 'http://localhost:5000/api/private/avatars/gh/uv/3/suprememoocow?s=128'
      }
    }
  ],
  room: {
    id: '5819cade769b5c3bc2966db6',
    name: 'gittertestbot',
    oneToOne: true,
    user: {
      id: '5819b589769b5c3bc2966d50',
      username: 'gittertestbot',
      displayName: 'gittertestbot',
      avatarUrl: 'http://localhost:5000/api/private/avatars/gh/uv/3/gittertestbot',
      avatarUrlSmall: 'http://localhost:5000/api/private/avatars/gh/uv/3/gittertestbot?s=60',
      avatarUrlMedium: 'http://localhost:5000/api/private/avatars/gh/uv/3/gittertestbot?s=128'
    },
    url: '/gittertestbot'
  },
  hasMentions: false
};

module.exports = {
  NEW_CHAT_GROUP_ROOM: NEW_CHAT_GROUP_ROOM,
  NEW_CHAT_ONE_TO_ONE_ROOM: NEW_CHAT_ONE_TO_ONE_ROOM
};
