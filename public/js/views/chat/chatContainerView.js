'use strict';

var Marionette = require('backbone.marionette');
var hasScrollBars = require('../../utils/scrollbar-detect');
var appEvents = require('../../utils/appevents');
var ChatCollectionView = require('../chat/chatCollectionView');
var ChatConnectionIndicatorView = require('../chat/chatConnectivityIndicatorView');
var context = require('gitter-web-client-context');
var unreadItemsClient = require('../../components/unread-items-client');
const isTouch = require('../../utils/is-touch');

require('../behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({
  behaviors: {
    Isomorphic: {
      chat: {
        el: '#chat-container',
        init: function(optionsForRegion) {
          var chatCollectionView = (this.chatCollectionView = new ChatCollectionView(
            optionsForRegion({
              collection: this.collection,
              decorators: this.options.decorators
            })
          ));

          if (this.options.monitorScrollPane) {
            unreadItemsClient.monitorViewForUnreadItems(
              this.options.monitorScrollPane,
              chatCollectionView
            );
          }

          return chatCollectionView;
        }
      },
      connectivityIndicator: {
        el: '.chat-connectivity-indicator-wrapper',
        init: 'initConnectivityIndicatorView'
      }
    }
  },

  initConnectivityIndicatorView: function(optionsForRegion) {
    if (context.hasFeature('connectivity-indicator')) {
      return new ChatConnectionIndicatorView(optionsForRegion({}));
    }
  },

  ui: {
    primaryScroll: '.primary-scroll'
  },

  events: {
    click: 'onClick'
  },

  onRender: function() {
    if (hasScrollBars()) {
      this.ui.primaryScroll.addClass('scroller');
    }
  },

  onClick: function(e) {
    var hasTextSelected = window.getSelection().toString().length > 0;
    if (
      !hasTextSelected &&
      !isTouch() && // on touch devices we use double tapping message to edit, the focus would intervene
      e.target.tagName.toLowerCase() !== 'textarea' &&
      // we want to focus a TMF input if user opens the TMF by clicking on
      // parent message indicator
      !e.target.className.match(/js-parent-message-indicator/)
    ) {
      appEvents.trigger('focus.request.chat');
    }
  }
});
