'use strict';

var appEvents = require('../../utils/appevents');
var ChatInputView = require('../chat/chatInputView');
var cocktail = require('backbone.cocktail');
var KeyboardEventsMixin = require('../keyboard-events-mixin');
var unreadItemsClient = require('../../components/unread-items-client');
var UnreadBannerView = require('../app/unreadBannerView');

var context = require('gitter-web-client-context');
var JoinRoomView = require('../chat/join-room-view');

//var ChatToolbarLayout = require('./chat-toolbar');
var ChatLayout = require('./chat');

require('../behaviors/isomorphic');

var EmbedLayout = ChatLayout.extend({
  monitorUnreadItems: true,
  keyboardEvents: {
    backspace: 'onKeyBackspace',
    quote: 'onKeyQuote'
  },

  modelEvents: {
    'change:roomMember': '_roomMemberChanged'
  },

  _roomMemberChanged: function() {
    var inputRegion = this.regionManager.get('input');

    if (this.model.get('roomMember')) {
      inputRegion.show(
        new ChatInputView({
          model: context.troupe(),
          collection: this.options.chatCollection
        })
      );
    } else {
      inputRegion.show(new JoinRoomView({}));
    }
  },

  behaviors: {
    Isomorphic: {
      chat: {
        el: '#content-wrapper',
        init: 'initChatRegion' // Declared in super
      },

      input: {
        el: '#chat-input',
        init: 'initInputRegion'
      },

      // TODO Move to chat-toolbar layout and
      // decide how are they gonna look like in mobile
      bannerTop: {
        el: '#unread-banner',
        init: 'initBannerTopRegion'
      },

      // TODO same ^^^
      bannerBottom: {
        el: '#bottom-unread-banner',
        init: 'initBannerBottomRegion'
      }
    }
  },

  initInputRegion: function(optionsForRegion) {
    if (this.model.get('roomMember')) {
      return new ChatInputView(
        optionsForRegion(
          {
            model: context.troupe(),
            collection: this.options.chatCollection
          },
          { rerender: true }
        )
      );
    } else {
      return new JoinRoomView(optionsForRegion({}, { rerender: true }));
    }
  },

  initBannerTopRegion: function(optionsForRegion) {
    return new UnreadBannerView.Top(
      optionsForRegion({
        model: unreadItemsClient.acrossTheFold()
      })
    );
  },

  initBannerBottomRegion: function(optionsForRegion) {
    return new UnreadBannerView.Bottom(
      optionsForRegion({
        model: unreadItemsClient.acrossTheFold()
      })
    );
  },

  onKeyBackspace: function(e) {
    e.stopPropagation();
    e.preventDefault();
  },

  onKeyQuote: function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.quoteText();
  },

  getSelectionText: function() {
    var text = '';
    if (window.getSelection) {
      text = window.getSelection().toString();
    } else if (document.selection && document.selection.type != 'Control') {
      text = document.selection.createRange().text;
    }
    return text;
  },

  quoteText: function() {
    var selectedText = this.getSelectionText();
    if (selectedText.length > 0) {
      appEvents.trigger('input.append', '> ' + selectedText, { newLine: true });
    }
  }
});

cocktail.mixin(EmbedLayout, KeyboardEventsMixin);

module.exports = EmbedLayout;
