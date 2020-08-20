/* eslint complexity: ["error", 16] */
'use strict';

var $ = require('jquery');
var Marionette = require('backbone.marionette');
var appEvents = require('../../utils/appevents');
var chatItemView = require('./chatItemView');
var Rollers = require('../../utils/rollers');
var isolateBurst = require('gitter-web-shared/burst/isolate-burst-bb');
var context = require('gitter-web-client-context');
var perfTiming = require('../../components/perf-timing');
var debug = require('debug-proxy')('app:chat-collection-view');

require('../behaviors/infinite-scroll');
require('../behaviors/smooth-scroll');

module.exports = (function() {
  function isFirstElementInParent(element) {
    var prev = element.previousSibling;
    if (!prev) return true;
    return (
      prev.nodeType === 3 /* TEXT */ &&
      !prev.previousSibling &&
      prev.textContent.match(/^[\s\n\r]*$/)
    ); /* Whitespace */
  }

  function isLastElementInParent(element) {
    var next = element.nextSibling;
    if (!next) return true;
    return (
      next.nodeType === 3 /* TEXT */ && !next.nextSibling && next.textContent.match(/^[\s\n\r]*$/)
    ); /* Whitespace */
  }

  function isAtStartOfParent(parent, element) {
    while (isFirstElementInParent(element) && element !== parent) element = element.parentElement;
    return element === parent;
  }

  function isAtEndOfParent(parent, element) {
    while (isLastElementInParent(element) && element !== parent) element = element.parentElement;
    return element === parent;
  }

  function getLastEditableMessageFromUser(collection, userId) {
    var usersChats = collection.filter(function(f) {
      var fromUser = f.get('fromUser');
      return fromUser && fromUser.id === userId;
    });

    return usersChats[usersChats.length - 1];
  }

  var SCROLL_ELEMENT = '#content-frame';

  function getModelsInRange(collectionView, startElement, endElement) {
    var models = [];
    var i = 0;
    var child,
      children = collectionView.children;

    /* Find the start element */
    while (i < children.length) {
      child = children.findByIndex(i);
      if (child.el === startElement) {
        break;
      }

      i++;
    }

    /* Find the end element */
    while (i < children.length) {
      child = children.findByIndex(i);
      models.push(child.model);
      if (child.el === endElement) {
        return models;
      }

      i++;
    }
    /* Didn't find the end */
    return [];
  }

  function renderMarkdown(models) {
    var text = models
      .map(function(model) {
        var text;

        if (models.length > 1 && model.get('burstStart')) {
          var user = model.get('fromUser');
          var username = user && user.username;
          if (username) username = '@' + username;
          text = username + '\n' + model.get('text');
        } else {
          text = model.get('text');
        }

        if (!text) return '';
        if (text.charAt(text.length - 1) !== '\n') text = text + '\n';
        return text;
      })
      .join('');

    if (text.charAt(text.length - 1) === '\n') return text.substring(0, text.length - 1);

    return text;
  }

  /*
   * View
   */
  var ChatCollectionView = Marionette.CollectionView.extend({
    template: false,
    reorderOnSort: true,

    behaviors: {
      InfiniteScroll: {
        reverseScrolling: true,
        scrollElementSelector: SCROLL_ELEMENT,
        contentWrapperSelector: '#chat-container'
      },
      SmoothScroll: {
        scrollElementSelector: SCROLL_ELEMENT,
        contentWrapper: '#chat-container'
      }
    },

    events: {
      copy: 'onCopy'
    },

    childView: chatItemView.ChatItemView,

    childViewOptions: function(item) {
      var options = {
        decorators: this.decorators,
        rollers: this.rollers
      };

      if (item && item.id) {
        // This allows the chat collection view to bind to an existing element...
        var e = this.$el.find('.model-id-' + item.id)[0];
        if (e) options.el = e;
      }

      return options;
    },

    initialize: function(options) {
      this.firstRender = true;
      this.viewComparator = this.collection.comparator;

      this.listenTo(appEvents, 'chatCollectionView:scrollToBottom', function() {
        this.collection.fetchLatest(
          {},
          function() {
            this.rollers.scrollToBottom();
            this.clearHighlight();
          },
          this
        );
      });

      this.listenTo(appEvents, 'chatCollectionView:selectedChat', function(id, opts) {
        var model = this.collection.get(id);

        // clearing previously highlighted chat.
        this.clearHighlight();

        if (!model) return;

        // highlighting new and replacing "current"
        this.highlightChat(model, opts.highlights);
        this.highlighted = model;

        // finally scroll to it
        this.scrollToChat(model);
      });

      // Similar to selectedChat, but will force a load if the item is not in the collection
      this.listenTo(
        appEvents,
        'chatCollectionView:permalinkHighlight',
        this.highlightPermalinkChat
      );

      this.listenTo(appEvents, 'chatCollectionView:clearHighlight', this.clearHighlight);

      this.listenTo(appEvents, 'chatCollectionView:loadAndHighlight', this.loadAndHighlight);

      var contentFrame = document.querySelector(SCROLL_ELEMENT);
      this.rollers = new Rollers(contentFrame, this.el);

      this.decorators = options.decorators || [];

      /* Scroll to the bottom when the user sends a new chat */
      this.listenTo(appEvents, 'chat.send', function() {
        this.rollers.scrollToBottom();
        this.collection.fetchLatest({}, function() {}, this);
      });

      // Special case when scrolling back down to the bottom.
      // If we are tracking 'bottom' we need to ensure
      // that we stop tracking bottom and switch to stable
      // as scroll view should track the visible elements,
      // not the bottom
      this.listenTo(this.collection, 'fetch:after', function() {
        debug('Switching rollers to stable and locking');
        this.rollers.stable();
        this.rollers.setModeLocked(true);
      });

      this.listenTo(this.collection, 'fetch:after:complete', function() {
        debug('Unlocking rollers');
        this.rollers.setModeLocked(false);
      });

      this.listenTo(appEvents, 'chatCollectionView:pageUp', this.pageUp);
      this.listenTo(appEvents, 'chatCollectionView:pageDown', this.pageDown);
      this.listenTo(appEvents, 'chatCollectionView:editLastChat', this.editLastChat);
      this.listenTo(appEvents, 'chatCollectionView:substLastChat', this.substLastChat);
      this.listenTo(appEvents, 'chatCollectionView:viewportResize', this.viewportResize);
      this.listenTo(appEvents, 'chatCollectionView:scrollToChatId', this.scrollToChatId);

      //When we change room, scroll to the bottom of the chatCollection
      this.listenTo(context.troupe(), 'change:id', function() {
        this.scrollToBottom();
      });
    },

    onTrackViewportCenter: function() {
      if (!this.isScrolledToBottom()) {
        var el = this.rollers.getMostCenteredElement();
        this.rollers.stable(el);
      }
    },

    scrollToBottom: function() {
      this.rollers.scrollToBottom();
    },

    isScrolledToBottom: function() {
      return this.rollers.isScrolledToBottom();
    },

    pageUp: function() {
      this.scroll.pageUp();
    },

    pageDown: function() {
      this.scroll.pageDown();
    },

    scrollToChat: function(chat) {
      const parentId = chat.get('parentId');
      if (parentId) {
        debug(
          `scrollToChat(${chat.id}) is in threaded conversation, scrolling to ${parentId} and opening thread`
        );
        appEvents.trigger('dispatchVueAction', 'threadMessageFeed/focusOnMessage', {
          id: chat.id
        });
        this.scrollToChatId(parentId);
      } else {
        const view = this.children.findByModel(chat);
        if (!view) {
          debug(`scrollToChat(${chat.id}) does not have view in the collectionView, doing nothing`);
          return;
        }
        debug(`scrollToChat(${chat.id}) to center of screen`);
        this.rollers.scrollToElement(view.el, { centre: true });
      }
    },

    scrollToChatId: function(id) {
      var model = this.collection.get(id);
      debug(`scrollToChatId(${id}) ->`, model);
      if (model) return this.scrollToChat(model);
      var self = this;
      this.collection.ensureLoaded(
        id,
        function() {
          var model = self.collection.get(id);
          debug(`scrollToChatId(${id}) -> ensureLoaded ->`, model);
          if (model) return this.scrollToChat(model);
        }.bind(this)
      );
    },

    // used to highlight and "dim" chat messages, the behaviour Highlight responds to these changes.
    // to "dim" simply leave out the arr argument
    highlightChat: function(model, arr) {
      model.set('highlights', arr || []);
    },

    clearHighlight: function() {
      var old = this.highlighted;
      if (!old) return;
      try {
        this.highlightChat(old);
      } catch (e) {
        debug('Could not clear previously highlighted item');
      }
    },

    // eslint-disable-next-line complexity
    onCopy: function(e) {
      if (!window.getSelection /* ios8 */) return;

      if (e.originalEvent) e = e.originalEvent;

      var selection = window.getSelection();
      if (!selection || !selection.rangeCount || !selection.getRangeAt) {
        /* Just use the default */
        return;
      }

      var range = selection.getRangeAt(0);
      var plainText = '' + selection;

      var start = $(range.startContainer).parents('.chat-item')[0];
      var end = $(range.endContainer).parents('.chat-item')[0];
      if (!start || !end) {
        /* Selection outside of chat items */
        return;
      }

      var startText = $(range.startContainer).parents('.js-chat-item-text')[0];
      var endText = $(range.endContainer).parents('.js-chat-item-text')[0];

      /* Has a single chat been selected? If so, only use markdown if the WHOLE chat has been selected, and not a partial selection */
      if (startText && endText && startText === endText) {
        /* Partial selection */
        if (range.startOffset > 0 || range.endOffset < range.endContainer.textContent.length)
          return;

        var atStart = isAtStartOfParent(startText, range.startContainer);
        var atEnd = isAtEndOfParent(startText, range.endContainer);
        if (!atStart || !atEnd) return;
      }

      var models = getModelsInRange(this, start, end);

      /* If the offset is the end of the start container */
      if (
        range.startContainer.textContent.length &&
        range.startContainer.textContent.length === range.startOffset
      )
        models.shift();

      /* ... or the beginning of the end container */
      if (range.endOffset === 0) models.pop();

      /* Nothing to render?*/
      if (!models.length) return;

      var text = renderMarkdown(models);
      e.clipboardData.setData('text/plain', plainText);
      e.clipboardData.setData('text/x-markdown', text);
      e.preventDefault();
    },

    editLastChat: function(userId) {
      var model = getLastEditableMessageFromUser(this.collection, userId);
      if (!model) return;

      var chatItemView = this.children.findByModel(model);
      if (!chatItemView) return;

      chatItemView.toggleEdit();
    },

    substLastChat: function(userId, search, replace, global) {
      var model = getLastEditableMessageFromUser(this.collection, userId);
      if (!model) return;

      var chatItemView = this.children.findByModel(model);
      if (!chatItemView) return;

      chatItemView.subst(search, replace, global);
    },

    viewportResize: function(animated) {
      if (animated) {
        this.rollers.adjustScrollContinuously(500);
      } else {
        this.rollers.adjustScroll(500);
      }
    },

    highlightPermalinkChat: function(id) {
      var self = this;
      this.collection.ensureLoaded(id, function(err, model) {
        if (err) return; // Log this?

        if (!model) return;

        // if permalink points to a child message
        const parentId = model.get('parentId');
        if (parentId) {
          appEvents.trigger('dispatchVueAction', 'threadMessageFeed/highlightChildMessage', {
            parentId,
            id: model.id
          });
          self.highlightPermalinkChat(parentId);
          return;
        }
        // if this is a parent message, open TMF as well as highlighting the parent message
        if (model.get('threadMessageCount')) {
          appEvents.trigger('dispatchVueAction', 'threadMessageFeed/open', model.id);
        }

        var models = isolateBurst(self.collection, model);
        models.forEach(function(model) {
          var view = self.children.findByModel(model);
          if (view) {
            view.highlight();
          }
        });

        self.scrollToChat(models[0]);
      });
    },

    loadAndHighlight: function(id, options) {
      this.collection.ensureLoaded(
        id,
        function(err, model) {
          if (err) return; // Log this?
          if (!model) return;

          // clearing previously highlighted chat.
          this.clearHighlight();

          if (!model) return;

          // highlighting new and replacing "current"
          this.highlightChat(model, options && options.highlights);
          this.highlighted = model;

          // finally scroll to it
          this.scrollToChat(model);
        }.bind(this)
      );
    },

    /**
     * There appears to be a race condition,
     * possibly caused by issuing multiple resets
     * in quick succession, whereby child
     * elements are cleaned up, but occasionally
     * stranded. See https://github.com/troupe/gitter-webapp/issues/615
     *
     * Although the views have been destroyed, the
     * DOM elements remain.
     *
     * This work-around trashes the inner DOM on a reset.
     *
     * Additionally, there is probably a performance
     * advantage to trashing the entire DOM in a single
     * remove
     */
    onBeforeRender: function() {
      perfTiming.start('chat-collection.render');

      this._renderStartTime = Date.now();

      if (this.collection.length) return;

      // The first time the collection is setup,
      // there will be pre-rendered content, so
      // don't trash the first time
      if (!this.isRendered) return;

      var el = this.el;
      var child;
      while ((child = el.firstChild)) {
        el.removeChild(child);
      }
    },

    onRender: function() {
      var hasItems = this.collection.length;

      if (!hasItems) return;
      perfTiming.end('chat-collection.render');

      if (!this.collection.loading) {
        perfTiming.end('room-switch.render');
      }

      var c = context();
      var permalinkChatId = c.permalinkChatId;

      if (permalinkChatId) {
        this.highlightPermalinkChat(permalinkChatId);
        delete c.permalinkChatId;
      }
    }
  });

  return ChatCollectionView;
})();
