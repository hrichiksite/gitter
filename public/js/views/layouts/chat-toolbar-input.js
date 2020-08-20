'use strict';

const debug = require('debug-proxy')('app:chat-toolbar-input');
var context = require('gitter-web-client-context');
var appEvents = require('../../utils/appevents');
var ChatInputView = require('../chat/chatInputView');
var cocktail = require('backbone.cocktail');
var KeyboardEventsMixin = require('../keyboard-events-mixin');
var unreadItemsClient = require('../../components/unread-items-client');
var UnreadBannerView = require('../app/unreadBannerView');
var ChatToolbarLayout = require('./chat-toolbar');
var CollaboratorsView = require('../app/collaboratorsView');
var JoinRoomView = require('../chat/join-room-view');

require('../behaviors/isomorphic');

var ChatToolbarInputLayout = ChatToolbarLayout.extend({
  monitorUnreadItems: true,
  keyboardEvents: {
    backspace: 'onKeyBackspace',
    quote: 'onKeyQuote'
  },

  modelEvents: {
    'change:roomMember': '_roomMemberChanged'
  },

  behaviors: {
    Isomorphic: {
      chat: {
        el: '#content-wrapper',
        init: 'initChatRegion' // Declared in super
      },

      toolbar: {
        el: '#right-toolbar-layout',
        init: 'initToolbarRegion' // Declared in super
      },

      input: {
        el: '#chat-input',
        init: 'initInputRegion'
      },

      header: {
        el: '#header-wrapper',
        init: 'initHeaderRegion' // Declared in super
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
      },

      collaborators: {
        el: '#collaborators-container',
        init: 'initCollaboratorsView'
      }
    }
  },

  initInputRegion: function(optionsForRegion) {
    if (this.model.get('roomMember')) {
      debug('Already a room member so showing chat input');
      return new ChatInputView(
        optionsForRegion({
          model: context.troupe(),
          collection: this.options.chatCollection
        })
      );
    } else {
      debug('Not a room member so showing join room button');
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

  initCollaboratorsView: function(optionsForRegion) {
    return new CollaboratorsView(optionsForRegion());
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
      if (!this.model.get('aboutToLeave')) {
        inputRegion.show(new JoinRoomView({}));
      }
    }
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

cocktail.mixin(ChatToolbarInputLayout, KeyboardEventsMixin);

module.exports = ChatToolbarInputLayout;
