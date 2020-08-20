'use strict';

const debug = require('debug-proxy')('app:mobile-native-embedded-chat');
var $ = require('jquery');
var context = require('gitter-web-client-context');
var liveContext = require('./components/live-context');
var chatModels = require('./collections/chat');
var ChatCollectionView = require('./views/chat/chatCollectionView');
var ChatInputView = require('./views/chat/chatInputView');
var unreadItemsClient = require('./components/unread-items-client');
var emojiDecorator = require('./views/chat/decorators/emojiDecorator');
var issuableDecorator = require('./views/chat/decorators/issuableDecorator');
var mobileDecorator = require('./views/chat/decorators/mobileDecorator');
var onready = require('././utils/onready');
var FastClick = require('fastclick');
var appEvents = require('./utils/appevents');
const toggleDarkTheme = require('./utils/toggle-dark-theme');

require('./components/eyeballs-room-sync');
require('./components/ping');

// Preload widgets
require('./views/widgets/avatar');
require('./template/helpers/all');

onready(function() {
  FastClick.attach(document.body);

  var chatCollection = new chatModels.ChatCollection(null, { listen: true });

  var chatCollectionView = new ChatCollectionView({
    el: $('#chat-container'),
    collection: chatCollection,
    decorators: [mobileDecorator, issuableDecorator, emojiDecorator]
  }).render();

  unreadItemsClient.syncCollections({
    chat: chatCollection
  });

  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'), chatCollectionView);

  // This is only used for Android (iOS has native inputs)
  var $chatInputWrapper = $('#chat-input-wrapper');
  if ($chatInputWrapper) {
    var room = context.troupe();

    if (!room.get('roomMember')) {
      // Im Andy Trevorah and I wrote this instead of using region switching because:
      // a) we need to hide the border between chat collection view and chat input
      // b) using web textinput on native apps is on its way out anyway
      // c) im lazy
      $chatInputWrapper.hide();
    }

    new ChatInputView({
      el: $('#chat-input'),
      model: room,
      collection: chatCollection
    }).render();

    room.on('change:roomMember', function(room, isMember) {
      // Im Andy Trevorah and I wrote this instead of using region switching because:
      // a) we need to hide the border between chat collection view and chat input
      // b) using web textinput on native apps is on its way out anyway
      // c) im so lazy that I copy and paste all my excuses
      if (isMember) {
        $chatInputWrapper.show();
      } else {
        $chatInputWrapper.hide();
      }
    });
  }

  // used by the ios native app v3.5.0+
  window._sendMessage = function(text) {
    var newMessage = {
      text: text,
      fromUser: context.getUser(),
      sent: null
    };
    chatCollection.create(newMessage);
    appEvents.trigger('chat.send');
  };

  window._toggleDarkTheme = function(isDarkModeOn) {
    debug(`_toggleDarkTheme ${isDarkModeOn}`);
    toggleDarkTheme(isDarkModeOn);
  };

  // Listen for changes to the room
  liveContext.syncRoom();

  $('html').removeClass('loading');
});
