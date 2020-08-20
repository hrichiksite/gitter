'use strict';
var Marionette = require('backbone.marionette');
var appEvents = require('../../utils/appevents');
var hasScrollBars = require('../../utils/scrollbar-detect');
var KeyboardEventMixin = require('../keyboard-events-mixin');
var cocktail = require('backbone.cocktail');
var isMobile = require('../../utils/is-mobile');
var RAF = require('../../utils/raf');

var ChatEditView = Marionette.ItemView.extend({
  template: false,

  events: {
    textInput: 'onTextInput',
    input: 'onInput',
    blur: 'onBlur'
  },

  keyboardEvents: {
    'chat.edit.escape': 'onKeyEscape',
    'chat.edit.send': 'onKeySend'
  },

  onRender: function() {
    if (hasScrollBars()) {
      this.$el.addClass('scroller');
    }

    this.onInput();
    return this;
  },

  onInput: function() {
    if (this.$el.val()) {
      this.expandTextareaIfNeeded();
    } else {
      this.shrinkTextarea();
    }
  },

  onBlur: function() {
    var self = this;

    if (isMobile()) {
      // if any listener does anthing to this.$el during the blur event,
      // then the dom node will throw a NotFoundError. So we delay until
      // the next event loop.
      RAF(function() {
        self.trigger('cancel');
      });
    } else {
      this.resetTextareaSize();
    }
  },

  onKeyEscape: function() {
    this.trigger('cancel');
  },

  onTextInput: function($event) {
    var event = $event.originalEvent;
    var key = event.data;
    if (isMobile() && key === '\n') {
      // google keyboard v4.1 on android doesnt actually send the correct
      // keyup/down events for the return key (code 13). This means that our
      // keyboardEvents dont fire, but we do have a "textInput" event that
      // we can fake it with.
      return this.onKeySend(event);
    }
  },

  onKeySend: function(event) {
    this.trigger('save', this.$el.val());
    event.preventDefault();
  },

  resetTextareaSize: function() {
    this.shrinkTextarea();
    this.expandTextareaIfNeeded();
  },

  shrinkTextarea: function() {
    this.$el.css('height', '');
    appEvents.trigger('chatCollectionView:viewportResize', false);
  },

  expandTextareaIfNeeded: function() {
    var $textarea = this.$el;
    var textarea = $textarea[0];
    var currentHeight = textarea.offsetHeight;
    var scrollHeight = textarea.scrollHeight;
    var maxHeight = window.innerHeight / 2;

    var newHeight = Math.min(scrollHeight, maxHeight);

    if (newHeight > currentHeight) {
      $textarea.css('height', newHeight);
      appEvents.trigger('chatCollectionView:viewportResize', true);
    }
  }
});

cocktail.mixin(ChatEditView, KeyboardEventMixin);

module.exports = ChatEditView;
