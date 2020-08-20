/* eslint-disable max-statements */
'use strict';
require('./utils/initial-setup');
require('./utils/font-setup');

var Backbone = require('backbone');
var context = require('gitter-web-client-context');
var clientEnv = require('gitter-client-env');
var debug = require('debug-proxy')('app:router-chat');
var fullTimeFormat = require('gitter-web-shared/time/full-time-format');

var onready = require('./utils/onready');
var appEvents = require('./utils/appevents');
var liveContext = require('./components/live-context');
var apiClient = require('./components/api-client');
var perfTiming = require('./components/perf-timing');
var itemCollections = require('./collections/instances/integrated-items');
var chatCollection = require('./collections/instances/chats-cached');
var ChatToolbarInputLayout = require('./views/layouts/chat-toolbar-input');
var DropTargetView = require('./views/app/dropTargetView');
var Router = require('./routes/router');
var roomRoutes = require('./routes/room-routes');
var notificationRoutes = require('./routes/notification-routes');

/* Set the timezone cookie */
require('./components/timezone-cookie');

require('./components/statsc');
require('./views/widgets/preload');
require('./components/dozy');
require('./template/helpers/all');
require('./components/eyeballs-room-sync');
require('./components/bug-reporting');
require('./components/focus-events');

// Preload widgets
require('./components/ping');

onready(function() {
  const user = context.user();
  debug(`onready:user=${user.get('username')}(${user.get('id')})`);

  require('./components/link-handler').installLinkHandler();
  const troupe = context.troupe();
  debug(`Rendering app with troupe`, troupe.attributes);
  var appView = new ChatToolbarInputLayout({
    model: troupe,
    template: false,
    el: 'body',
    chatCollection: chatCollection
  });

  appView.render();

  /* Drag and drop */
  new DropTargetView({ template: false, el: 'body' }).render();

  var router = new Router({
    dialogRegion: appView.dialogRegion,
    routes: [
      notificationRoutes(),
      roomRoutes({
        rosterCollection: itemCollections.roster
      })
    ]
  });

  const changeRoom = (newTroupe, permalinkChatId) => {
    perfTiming.start('room-switch.render');

    debug('changing room: %j', newTroupe);

    // destroy any modal views
    router.navigate('', { trigger: true, replace: true });

    //set the context troupe to new troupe
    context.setTroupe(newTroupe);

    if (permalinkChatId) {
      appEvents.trigger('chatCollectionView:permalinkHighlight', permalinkChatId);
    }

    //after the room change is complete, focus on the chat input jp 5/11/15
    appEvents.trigger('focus.request.chat');
  };

  function parsePostMessage(e) {
    // Shortcut for performance
    if (!e || !e.data || typeof e.data !== 'string') return;

    if (e.origin !== clientEnv.basePath) {
      debug('Ignoring message from ' + e.origin);
      return;
    }

    try {
      return JSON.parse(e.data);
    } catch (err) {
      /* It seems as through chrome extensions use this event to pass messages too. Ignore them. */
      return;
    }
  }

  window.addEventListener('message', function(e) {
    var message = parsePostMessage(e);
    if (!message) return;

    debug('Received message %j', message);

    var makeEvent = function(message) {
      var origin = 'app';
      if (message.event && message.event.origin) origin = message.event.origin;
      message.event = {
        origin: origin,
        preventDefault: function() {},

        stopPropagation: function() {},

        stopImmediatePropagation: function() {}
      };
    };

    switch (message.type) {
      case 'keyboard':
        makeEvent(message);
        appEvents.trigger('keyboard.' + message.name, message.event, message.handler);
        appEvents.trigger('keyboard.all', message.name, message.event, message.handler);
        break;

      case 'focus':
        makeEvent(message);
        appEvents.trigger('focus.request.' + message.focus, message.event);
        break;

      case 'permalink.navigate':
        var query = message.query;
        /* Only supports at for now..... */
        var aroundId = query && query.at;

        if (aroundId) {
          appEvents.trigger('chatCollectionView:permalinkHighlight', aroundId);
        }

        break;

      case 'change:room':
        changeRoom(message.newTroupe, message.permalinkChatId);
        break;

      case 'roomList':
        appEvents.trigger('chat-cache:preload', message.rooms);
        break;
    }
  });

  appEvents.on('vue:change:room', function(room) {
    changeRoom(room);
  });

  appEvents.on('vue:hightLightedMessageId', function(messageId) {
    appEvents.trigger('chatCollectionView:permalinkHighlight', messageId);
  });

  appEvents.on('permalink.requested', function(type, chat, options) {
    debug('permalink.requested', type, chat, options);
    if (context.inOneToOneTroupeContext()) return; // No permalinks to one-to-one chats
    var url = context.troupe().get('url');
    var id = chat.id;

    if (options && options.appendInput) {
      var fullUrl = clientEnv.basePath + url + '?at=' + id;
      var formattedDate = fullTimeFormat(chat.get('sent'));
      appEvents.trigger('input.append', ':point_up: [' + formattedDate + '](' + fullUrl + ')');
    }
  });

  var notifyRemoveError = function(message) {
    appEvents.triggerParent('user_notification', {
      title: 'Failed to remove user',
      text: message,
      className: 'notification-error'
    });
  };

  appEvents.on('command.room.remove', function(username) {
    if (!username) return;

    apiClient.room.delete('/users/' + username + '?type=username', '').catch(function(e) {
      notifyRemoveError(e.friendlyMessage || 'Unable to remove user');
    });
  });

  var showingHelp = false;
  var hideHelp = function() {
    router.navigate('', { trigger: true });
    showingHelp = false;
  };

  // The help can be exited from the modal itself so keep our variable up to date.
  // Instead of this, there should be a way to check if a help modal is open
  // which would be cleaner than this variable maintenance
  appEvents.on('help.close', function() {
    showingHelp = false;
  });

  appEvents.on('keyboard.help.markdown', function(event) {
    if (showingHelp === 'markdown') hideHelp();
    else {
      appEvents.trigger('focus.request.out', event);
      router.navigate('markdown', { trigger: true });
      showingHelp = 'markdown';
    }
  });

  appEvents.on('keyboard.help.keyboard', function(event) {
    if (showingHelp === 'keys') hideHelp();
    else {
      appEvents.trigger('focus.request.out', event);
      router.navigate('keys', { trigger: true });
      showingHelp = 'keys';
    }
  });

  appEvents.on('keyboard.document.escape', function() {
    if (showingHelp) hideHelp();
  });

  // Listen for changes to the room
  liveContext.syncRoom();

  Backbone.history.stop();
  Backbone.history.start();
});
