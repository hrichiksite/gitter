'use strict';

const debug = require('debug-proxy')('app:chat-input-box-view');
var Marionette = require('backbone.marionette');
var template = require('./tmpl/chat-input-box.hbs');
var drafty = require('../../components/drafty');
var commands = require('./commands');
var typeaheads = require('./typeaheads');
var platformKeys = require('../../utils/platform-keys');
var RAF = require('../../utils/raf');
var cocktail = require('backbone.cocktail');
var KeyboardEventsMixin = require('../keyboard-events-mixin');
var appEvents = require('../../utils/appevents');
var context = require('gitter-web-client-context');
const isTouch = require('../../utils/is-touch');
const toggleClass = require('../../utils/toggle-class');

require('jquery-textcomplete'); // eslint-disable-line node/no-missing-require

var PLACEHOLDER = 'Click here to type a chat message. Supports GitHub flavoured markdown.';
var PLACEHOLDER_MOBILE = 'Touch here to type a chat message.';
var PLACEHOLDER_COMPOSE_MODE = PLACEHOLDER + ' ' + platformKeys.cmd + '+Enter to send.';

function isStatusMessage(text) {
  // if it starts with '/me' it should be a status update
  return /^\/me /.test(text);
}

function textToStatus(text) {
  return text.replace(/^\/me /, '@' + context.getUser().username + ' ');
}

var ChatInputBoxView = Marionette.ItemView.extend({
  template: template,

  tagName: 'form',

  attributes: {
    class: 'chat-input__box',
    name: 'chat'
  },

  ui: {
    textarea: 'textarea'
  },

  events: {
    'textInput textarea': 'onTextInput',
    'input textarea': 'onTextChange',
    'paste textarea': 'onPaste',
    'keydown textarea': 'onKeydown',
    'blur textarea': 'onBlur',
    'touchend textarea': 'onTouchend',
    'textComplete:show textarea': 'onTextCompleteShow',
    'textComplete:hide textarea': 'onTextCompleteHide'
  },

  keyboardEvents: {
    'chat.compose.auto': 'createCodeBlockOnNewline',
    'chat.edit.openLast': 'onKeyEditLast',
    'chat.send': 'onKeySend'
  },

  initialize: function(options) {
    this.composeMode = options.composeMode;
    this.listenTo(this.composeMode, 'change:isComposeModeEnabled', this.onComposeModeChange);
    this.listenTo(appEvents, 'input.append', this.append);
    this.listenTo(appEvents, 'focus.request.chat', function() {
      this.focusTextAreaForNonTouchDevices();
    });

    this.listenTo(context.troupe(), 'change:id', function(model) {
      // Get drafty to switch rooms
      var drafty = this.drafty;
      if (!drafty) return;
      drafty.setUniqueId(model.id);
    });
  },

  serializeData: function() {
    return {
      isTouch: isTouch()
    };
  },

  onRender: function() {
    if (!this.ui.textarea.length) return;

    this.removeTextareaExtensions();
    this.addTextareaExtensions();

    if (!isTouch()) {
      RAF(() => {
        // firefox only respects the "autofocus" attr if it is present on source html
        // also, dont show keyboard right away on mobile
        // Also, move the cursor to the end of the textarea text

        this.setCaretPosition();
        this.focusTextAreaForNonTouchDevices();

        // We add this to always be consistent with size after initialization.
        // Otherwise we are relying on the `blur` event to run this which isn't
        // consistent in e2e tests
        this.resetTextareaSize();
      });
    }
  },

  onComposeModeChange: function(model, isComposeModeEnabled) {
    var placeholder;

    if (isTouch()) {
      placeholder = PLACEHOLDER_MOBILE;
    } else {
      placeholder = isComposeModeEnabled ? PLACEHOLDER_COMPOSE_MODE : PLACEHOLDER;
    }

    this.ui.textarea.attr('placeholder', placeholder);
  },

  onTextInput: function($event) {
    var event = $event.originalEvent;
    var key = event.data;
    if (isTouch() && key === '\n') {
      // google keyboard v4.1 on android doesnt actually send the correct
      // keyup/down events for the return key (code 13). This means that our
      // keyboardEvents dont fire, but we do have a "textInput" event that
      // we can fake it with as long as compose mode isnt enabled (which it
      // isnt on mobile).
      return this.onKeySend(event, { mods: [] });
    }
  },

  onTextChange: function() {
    if (this.ui.textarea.val()) {
      this.expandTextareaIfNeeded();
    } else {
      this.shrinkTextarea();
    }
  },

  onPaste: function(e) {
    if (e.originalEvent) e = e.originalEvent;
    if (!e.clipboardData) return;
    var markdown = e.clipboardData.getData('text/x-markdown');

    if (markdown) {
      var val = this.ui.textarea.val();
      var el = this.ui.textarea[0];

      var selectionStart = el.selectionStart;
      var selectionEnd = el.selectionEnd;

      this.setText(val.substring(0, selectionStart) + markdown + val.substring(selectionEnd));

      this.setCaretPosition(selectionStart + markdown.length);

      // dont paste twice
      e.preventDefault();
    }
  },

  onKeydown: function(e) {
    if (e.keyCode === 33 || e.keyCode === 34) {
      appEvents.trigger(
        e.keyCode === 33 ? 'chatCollectionView:pageUp' : 'chatCollectionView:pageDown'
      );
      // dont scroll the textarea
      e.preventDefault();
    }
  },

  onBlur: function() {
    if (this.isTypeaheadShowing()) return;

    this.resetTextareaSize();
  },

  onTouchend: function() {
    // this fixed an issue with the ios native client, but is super annoying
    // on normal mobile web and webviews
    // TODO: check if this is still a problem.
    // http://stackoverflow.com/questions/16149083/keyboardshrinksview-makes-lose-focus/18904886#18904886
    // var self = this;
    // setTimeout(function() {
    //   self.ui.textarea.focus();
    // }, 300);
  },

  // disable keyboard shortcuts
  onTextCompleteShow: function() {
    this.ui.textarea.attr('data-prevent-keys', 'on');
  },

  // reenable keyboard shortcuts
  onTextCompleteHide: function() {
    var self = this;

    // Defer change to make sure the last key event is prevented
    setTimeout(function() {
      self.ui.textarea.attr('data-prevent-keys', 'off');
    }, 0);
  },

  onKeyEditLast: function() {
    if (this.ui.textarea.val()) return;

    appEvents.trigger('chatCollectionView:editLastChat', context.getUserId());
  },

  onKeySend: function(event, handler) {
    var isComposeModeEnabled = this.composeMode.get('isComposeModeEnabled');
    // Has a modifier or not in compose mode
    var shouldHandle = handler.mods.length || !isComposeModeEnabled;

    if (!this.isTypeaheadShowing() && shouldHandle) {
      this.processInput();
      event.preventDefault();
      return false;
    }
  },

  processInput: function() {
    if (!this.hasVisibleText()) return;

    var text = this.ui.textarea.val();
    var cmd = commands.findMatch(text);

    // `/me` command has no action, is handled by `send`
    var isElgible = cmd && (!cmd.criteria || cmd.criteria());
    if (isElgible && cmd.action) {
      cmd.action(text);
    } else {
      this.send(text);
    }
    this.clear();
  },

  send: function(text) {
    var newMessage = {
      text: text,
      fromUser: context.getUser()
    };

    if (isStatusMessage(text)) {
      newMessage.text = textToStatus(text);
      newMessage.status = true;
    }

    this.collection.create(newMessage);

    appEvents.trigger('chat.send');
  },

  clear: function() {
    this.setText('');
    if (this.drafty) this.drafty.reset();
  },

  append: function(text, options) {
    debug('append', text, options);
    var current = this.ui.textarea.val();
    if (!this.hasVisibleText()) {
      current = current + text;
    } else {
      if (options && options.newLine) {
        current = current + '\n' + text;
      } else {
        current = current + ' ' + text;
      }
    }

    this.setText(current);
    this.setCaretPosition();
    this.focusTextAreaForNonTouchDevices();

    // scroll input to bottom
    this.ui.textarea[0].scrollTop = this.ui.textarea[0].clientHeight;
  },

  focusTextAreaForNonTouchDevices() {
    if (!isTouch()) {
      debug('focusTextAreaForNonTouchDevices');
      this.ui.textarea.focus();
    }
  },

  createCodeBlockOnNewline: function(event) {
    var text = this.ui.textarea.val();

    // only continue if user has just started code block (```)
    var matches = text.match(/^```([\w\-]+)?$/);
    if (!matches) return;

    // create the rest of the code block
    this.setText(text + '\n\n```');

    // move caret inside the new code block
    this.setCaretPosition(matches[0].length + 1);

    if (!this.composeMode.get('isComposeModeEnabled') && !isTouch()) {
      // switch to compose mode for the lifetime of this message
      this.composeMode.set('isComposeModeEnabled', true);
      this.listenToOnce(appEvents, 'chat.send', function() {
        this.composeMode.set('isComposeModeEnabled', false);
      });
    }

    // we've already created a new line so stop the original return event
    event.preventDefault();
  },

  setText: function(text) {
    this.ui.textarea.val(text);

    // trigger the textarea resizing
    this.onTextChange();
  },

  setCaretPosition: function(position) {
    debug('setCaretPosition', position);
    // default to end of text
    position = position || this.ui.textarea.val().length;

    this.focusTextAreaForNonTouchDevices();
    var el = this.ui.textarea[0];
    el.setSelectionRange(position, position);
  },

  resetTextareaSize: function() {
    debug('resetTextareaSize');
    this.shrinkTextarea();
    this.expandTextareaIfNeeded();

    // We only use this in our e2e tests to ensure the reset happened and the layout won't shift around anymore
    toggleClass(this.ui.textarea[0], 'js-reset-textarea-size', true);
  },

  shrinkTextarea: function() {
    debug('shrinkTextarea');
    this.ui.textarea.css('height', '');
    appEvents.trigger('chatCollectionView:viewportResize', false);
  },

  expandTextareaIfNeeded: function() {
    debug('expandTextareaIfNeeded');
    var $textarea = this.ui.textarea;
    var textarea = $textarea[0];
    var currentHeight = textarea.offsetHeight;
    var scrollHeight = textarea.scrollHeight;
    var maxHeight = window.innerHeight / 2;

    var newHeight = Math.min(scrollHeight, maxHeight);

    if (newHeight > currentHeight) {
      $textarea.css('height', newHeight);
      appEvents.trigger('chatCollectionView:viewportResize', true);
    }
  },

  addTextareaExtensions: function() {
    this.ui.textarea.textcomplete(typeaheads(this.collection));
    this.drafty = drafty(this.ui.textarea[0], context.troupe().get('id'));
  },

  removeTextareaExtensions: function() {
    // only way to remove textcomplete's event listeners
    this.ui.textarea.off();
    if (this.drafty) this.drafty.disconnect();
    this.drafty = null;
  },

  isTypeaheadShowing: function() {
    return this.$el.find('.dropdown-menu').is(':visible');
  },

  hasVisibleText: function() {
    var text = this.ui.textarea.val();
    return text && !text.match(/^\s+$/);
  },

  onDestroy: function() {
    this.removeTextareaExtensions();
  }
});

cocktail.mixin(ChatInputBoxView, KeyboardEventsMixin);

module.exports = ChatInputBoxView;
