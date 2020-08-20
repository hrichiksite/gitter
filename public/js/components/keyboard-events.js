'use strict';

var appEvents = require('../utils/appevents');
var platformKeys = require('../utils/platform-keys');
var _ = require('lodash');
var key = require('keymaster');

module.exports = (function() {
  function getScope(element) {
    if (element.id === 'chat-input-textarea') {
      return 'input.chat';
    }

    if (element.id === 'list-search-input' || element.classList.contains('js-search-input')) {
      return 'input.search';
    }

    if (/^trpChatInput/.test(element.className)) {
      return 'input.chat.edit';
    }

    if (/^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName)) {
      return 'input.other';
    }

    if (element.classList.contains('js-room-topic-edit-activator')) {
      return 'button.room-topic-edit';
    }

    if (element.classList.contains('js-profile-menu-toggle')) {
      return 'button.profile-menu';
    }

    if (element.classList.contains('room-menu-options__item-button')) {
      return 'minibar.item';
    }

    if (element.classList.contains('room-item__container')) {
      return 'room-list.item';
    }

    return 'other';
  }

  // Attach keyboard events listeners as specified by the keymaster library
  // They will we emitted to appEvents with the `keyboard.` prefix
  // Use views/keyboard-events-mixin to attach handlers for these events to Backbone components
  var cmdKey = platformKeys.cmd;
  var gitterKey = platformKeys.gitter;

  // Define different scopes for the key listeners
  // - 'input.chat' for the chat message input
  // - 'input.chat.edit' for the chat message edit input
  // - 'input.search' for the search input
  // - 'input.other' for other inputs (including textarea and select)
  // - 'other' for the rest
  key.filter = function(event) {
    var tag = event.target || event.srcElement;

    if (tag.getAttribute('data-prevent-keys') === 'on') {
      return false; // Prevent triggering
    }

    var scope = getScope(tag);
    key.setScope(scope);
    return true;
  };

  // Key mappings
  // Basic usage: 'key': 'event name', scope is 'all' by default
  // Set to a scope: 'key': {name, scope}, scope can be an Array
  // Multiple names/scopes: 'key': ['event name', {name, scope}, ...]
  var keyEvents = {
    backspace: {
      name: 'backspace',
      scope: 'other'
    },
    esc: [
      {
        name: 'chat.escape',
        scope: 'input.chat'
      },
      {
        name: 'chat.edit.escape',
        scope: 'input.chat.edit'
      },
      {
        name: 'search.escape',
        scope: 'input.search'
      },
      {
        name: 'maininput.escape',
        scope: ['input.chat', 'input.search']
      },
      {
        name: 'input.escape',
        scope: 'input.other'
      },
      {
        name: 'document.escape',
        scope: 'other'
      }
    ],
    space: [
      {
        name: 'room-topic.edit',
        scope: 'button.room-topic-edit'
      },
      {
        name: 'profile-menu.toggle',
        scope: 'button.profile-menu'
      }
    ],
    enter: [
      {
        name: 'search.go',
        scope: 'input.search'
      },
      {
        name: 'chat.compose.auto',
        scope: 'input.chat'
      },
      {
        name: 'room-topic.edit',
        scope: 'button.room-topic-edit'
      },
      {
        name: 'profile-menu.toggle',
        scope: 'button.profile-menu'
      }
    ],
    'shift+enter': [
      {
        name: 'chat.compose.auto',
        scope: 'input.chat'
      }
    ],
    up: [
      {
        name: 'room.up',
        scope: 'minibar.item'
      },
      {
        name: 'room.up',
        scope: 'room-list.item'
      },
      {
        name: 'chat.edit.openLast',
        scope: 'input.chat'
      },
      {
        name: 'search.prev',
        scope: 'input.search'
      }
    ],
    down: [
      {
        name: 'room.down',
        scope: 'minibar.item'
      },
      {
        name: 'room.down',
        scope: 'room-list.item'
      },
      {
        name: 'search.next',
        scope: 'input.search'
      }
    ],
    right: [
      {
        name: 'room.next',
        scope: 'minibar.item'
      },
      {
        name: 'room.next',
        scope: 'room-list.item'
      }
    ],
    left: [
      {
        name: 'room.prev',
        scope: 'minibar.item'
      },
      {
        name: 'room.prev',
        scope: 'room-list.item'
      }
    ],
    /* */
    tab: [
      {
        name: 'room.tab',
        scope: 'minibar.item'
      },
      {
        name: 'room.tab',
        scope: 'room-list.item'
      }
    ],
    '⇧+tab': [
      {
        name: 'room.prev.tab',
        scope: 'minibar.item'
      },
      {
        name: 'room.prev.tab',
        scope: 'room-list.item'
      }
    ],
    /* */
    pageup: 'pageUp',
    pagedown: 'pageDown',
    'q, r': {
      name: 'quote',
      scope: 'other'
    },
    'shift+/,?': [
      {
        name: 'help.keyboard',
        scope: 'other'
      }
    ]
  };

  // OS-specific modifier key
  keyEvents['enter, ' + cmdKey + '+enter'] = [
    {
      name: 'chat.send',
      scope: 'input.chat'
    },
    {
      name: 'chat.edit.send',
      scope: 'input.chat.edit'
    }
  ];

  keyEvents[cmdKey + '+/, ' + cmdKey + '+' + gitterKey + '+/'] = { name: 'chat.toggle' };
  keyEvents[cmdKey + '+' + '+s'] = 'focus.search';
  keyEvents[cmdKey + '+' + gitterKey + '+c'] = { name: 'focus.chat', scope: 'other' };
  keyEvents[cmdKey + '+' + gitterKey + '+m'] = 'help.markdown';
  keyEvents[cmdKey + '+' + gitterKey + '+k'] = 'help.keyboard';
  keyEvents[cmdKey + '+' + gitterKey + '+up'] = { name: 'room.up', scope: 'other' };
  keyEvents[cmdKey + '+' + gitterKey + '+down'] = { name: 'room.down', scope: 'other' };
  keyEvents[cmdKey + '+' + gitterKey + '+left'] = { name: 'room.prev', scope: 'other' };
  keyEvents[cmdKey + '+' + gitterKey + '+right'] = { name: 'room.next', scope: 'other' };
  keyEvents[cmdKey + '+' + gitterKey + '+enter'] = { name: 'room.enter', scope: 'other' };

  // Go to a conversation by index in list
  _.each('123456789'.split(''), function(n) {
    keyEvents[cmdKey + '+' + gitterKey + '+' + n] = 'room.' + n;
  });
  keyEvents[cmdKey + '+' + gitterKey + '+0'] = 'room.10';

  // Add listeners

  var assign = function(k, name, scope) {
    if (_.isObject(name)) {
      scope = name.scope;
      name = name.name;
    }
    scope = scope || 'all';

    var _assign = function(s) {
      key(k, s, function(event, handler) {
        appEvents.trigger('keyboard.' + name, event, handler);
        appEvents.trigger('keyboard.all', name, event, handler);
      });
    };

    if (_.isArray(scope)) {
      // multiple scopes
      _.each(scope, _assign);
    } else {
      _assign(scope);
    }
  };

  _.each(keyEvents, function(name, k) {
    if (_.isArray(name)) {
      // multiple mappings
      _.each(name, function(n) {
        assign(k, n);
      });
    } else {
      assign(k, name);
    }
  });
})();
