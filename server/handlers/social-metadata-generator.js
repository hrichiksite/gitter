'use strict';

var env = require('gitter-web-env');
var nconf = env.config;
var avatars = require('gitter-web-avatars');
const truncateText = require('gitter-web-shared/truncate-text');

var facebookAppId = nconf.get('facebook:appId');

function getMetadata(options) {
  var room = options && options.room;

  var title = (room && room.uri) || 'Gitter';
  var description = (room && room.topic) || 'Where developers come to talk.';
  var imageUrl = (room && room.avatarUrl) || avatars.getDefault();

  return {
    'og:title': title,
    'og:description': description,
    'og:type': 'website',
    'og:image': imageUrl,
    'fb:app_id': facebookAppId,
    'twitter:card': 'summary',
    'twitter:site': '@gitchat',
    'twitter:title': truncateText(title, 70),
    'twitter:description': truncateText(description, 200),
    'twitter:image': imageUrl
  };
}

function getMetadataForChatPermalink(options) {
  var room = options && options.room;
  var chat = options && options.chat;

  if (!chat || !chat.fromUser) return getMetadata(options);

  var fromUser = chat.fromUser;

  var title = (room && room.uri) || 'Gitter';
  var description = '@' + fromUser.username + ': ' + chat.text;
  var imageUrl = (room && room.avatarUrl) || avatars.getDefault();

  return {
    'og:title': title,
    'og:description': description,
    'og:type': 'website',
    'og:image': imageUrl,
    'fb:app_id': facebookAppId,
    'twitter:card': 'summary',
    'twitter:site': '@gitchat',
    'twitter:title': truncateText(title, 70),
    'twitter:description': truncateText(description, 200),
    'twitter:image': imageUrl
  };
}

module.exports = {
  getMetadata: getMetadata,
  getMetadataForChatPermalink: getMetadataForChatPermalink
};
