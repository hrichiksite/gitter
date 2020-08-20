'use strict';
var $ = require('jquery');
var _ = require('lodash');
var appEvents = require('../utils/appevents');

module.exports = (function() {
  // Central logic for focus events
  // Listens to specific keyboard events to trigger corresponding 'focus.request' events

  var previousFocusOutOrigin;
  var $previous;
  var isEditing = false;
  var thisFrame = ($('#content-frame').hasClass('trpChatContainer') && 'chat') || 'app';

  // Listen to chat.edit toggle to handle proper focus between inputs

  appEvents.on('chat.edit.show', function() {
    isEditing = true;
  });
  appEvents.on('chat.edit.hide', function() {
    isEditing = false;
  });

  var getTabOrder = function() {
    var order = ['chat', 'search'];
    if (isEditing) order.push('chat.edit');
    return order;
  };

  var findNewFocus = function(fromScope, position) {
    var order = getTabOrder();
    var name = fromScope.replace('input.', '');
    var index = order.indexOf(name);
    var findIndex = index + position;

    if (index === -1 || !order[findIndex]) {
      // not found
      if (position === -1) return order[order.length - 1];
      return order[0];
    }
    return order[findIndex];
  };

  var focusNext = function(event, handler) {
    appEvents.trigger('focus.request.' + findNewFocus(handler.scope, 1));
  };

  var focusPrev = function(event, handler) {
    appEvents.trigger('focus.request.' + findNewFocus(handler.scope, -1));
  };

  // Manage 'escape' events on elements to 'blur' them
  // 'focus' back when another 'escape' event is triggered

  var focusOut = function(event) {
    if (event.origin) {
      // If the original event comes from another frame, transfer the focus request to it
      if (event.origin !== thisFrame) {
        previousFocusOutOrigin = event.origin;
        return appEvents.trigger('focus.request.' + event.origin + '.out', event);
      }
      // If an event comes back to its original frame, it's because it originated in it
      // but the logic can be present in another frame, that would delegate the focus logic back to the original frame
      // It's also possible that the event fired in multiple frames, so we need to make sure it is not handled twice
      if ($previous) return;
    }

    // Only accept focus out request from inputs
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      $previous = $(document.activeElement);
      $previous.blur();
      appEvents.trigger('focus.change.out', $previous);
    }

    // Focus the outer frame when you escape
    window.top.focus();
  };

  var focusIn = function(event) {
    // If the original event comes from another frame, transfer the focus request to it
    if (event.origin && event.origin !== 'top' && event.origin !== thisFrame) {
      return appEvents.trigger('focus.request.' + event.origin + '.in', event);
    } else if (previousFocusOutOrigin && previousFocusOutOrigin !== thisFrame) {
      var newEvent = new Event(event);
      newEvent.origin = 'top';
      return appEvents.trigger('focus.request.' + previousFocusOutOrigin + '.in', newEvent);
    }

    if ($previous) {
      $previous.focus();
      appEvents.trigger('focus.change.in', $previous);
      $previous = null;
    }
  };

  // Mapping from appEvents to specific callbacks
  // or shortcuts for 'focus.request' triggers

  var mappings = {
    'keyboard.focus.search': 'search',
    'keyboard.focus.chat': 'chat',
    'keyboard.maininput.tab.next': focusNext,
    'keyboard.maininput.tab.prev': focusPrev,
    'focus.request.out keyboard.maininput.escape keyboard.input.escape': focusOut,
    'focus.request.in keyboard.document.escape': focusIn
  };

  var _bind = function(src, dest) {
    appEvents.on(src, function(e) {
      if (!e.origin) e.preventDefault();
      var args = Array.prototype.slice.call(arguments);
      if (_.isFunction(dest)) {
        dest.apply(dest, args);
      } else {
        args.unshift('focus.request.' + dest);
        appEvents.trigger.apply(appEvents, args);
      }
    });
  };

  var eventSplitter = /\s+/; // checks for whitespace

  _.each(mappings, function(dest, src) {
    if (eventSplitter.test(src)) {
      var sources = src.split(eventSplitter);
      _.each(sources, function(s) {
        _bind(s, dest);
      });
    } else {
      _bind(src, dest);
    }
  });
})();
