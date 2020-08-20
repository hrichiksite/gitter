/* eslint-disable complexity, max-statements */
'use strict';

require('./utils/initial-setup');
require('./utils/font-setup');

var debug = require('debug-proxy')('app:router-app');
var Backbone = require('backbone');
var moment = require('moment');
var clientEnv = require('gitter-client-env');

var onready = require('./utils/onready');
var urlParser = require('./utils/url-parser');
var appEvents = require('./utils/appevents');
var context = require('gitter-web-client-context');
const generatePermalink = require('gitter-web-shared/chat/generate-permalink');

var TitlebarUpdater = require('./components/titlebar');
const userNotifications = require('./components/user-notifications');
var RoomCollectionTracker = require('./components/room-collection-tracker');
var SPARoomSwitcher = require('./components/spa-room-switcher');
var linkHandler = require('./components/link-handler');
var troupeCollections = require('./collections/instances/troupes');
var modalRegion = require('./components/modal-region');
var Router = require('./routes/router');
var notificationRoutes = require('./routes/notification-routes');
var createRoutes = require('./routes/create-routes');
var upgradeAccessRoutes = require('./routes/upgrade-access-routes');
var userRoutes = require('./routes/user-routes');
const pushState = require('./utils/browser/pushState');
const replaceState = require('./utils/browser/replaceState');

require('./components/statsc');
require('./views/widgets/preload');
require('./template/helpers/all');
require('./components/bug-reporting');
require('./components/focus-events');

require('./utils/tracking');
require('./components/ping');

// Preload widgets
require('./views/widgets/avatar');

// Include modal styles
require('@gitterhq/styleguide/css/components/modals.css');

userNotifications.initUserNotifications();

onready(function() {
  const user = context.user();
  debug(`onready:user=${user.get('username')}(${user.get('id')})`);

  // eslint-disable-next-line no-unused-vars
  var router = new Router({
    dialogRegion: modalRegion,
    routes: [userRoutes(), notificationRoutes(), createRoutes(), upgradeAccessRoutes()]
  });

  Backbone.history.stop();
  Backbone.history.start();

  var titlebarUpdater = new TitlebarUpdater();

  /* Replace the `null` state on startup with the real state, so that when a client clicks back to the
   * first page of gitter, we know what the original URL was (instead of null)
   */
  replaceState(window.location.href, '');

  /* TODO: add the link handler here? */
  require('./components/link-handler').installLinkHandler();

  /*
   * Push State Management
   */

  function getContentFrameLocation() {
    var contentFrame = document.querySelector('#content-frame');
    return contentFrame.contentWindow.location;
  }

  const roomSwitcher = new SPARoomSwitcher(
    troupeCollections.troupes,
    clientEnv.basePath,
    getContentFrameLocation
  );

  roomSwitcher.on('switch', function(troupe) {
    debug('Room switch: switch to %s', troupe.attributes);

    // Set the last access time immediately to prevent
    // delay in hidden rooms becoming visible only
    // once we get the server-side update
    var liveCollectionTroupe = troupeCollections.troupes.get(troupe.id);
    if (liveCollectionTroupe) {
      liveCollectionTroupe.set('lastAccessTime', moment());
    }
  });

  function pushStateWithTitleBar(url, title) {
    pushState(url, title);
    titlebarUpdater.setRoomName(title);
  }

  /* Deal with the popstate */
  window.onpopstate = function(e) {
    var iframeUrl = e.state;
    debug(`onpopstate iframeUrl=${iframeUrl}`);
    if (!iframeUrl) return;

    //generate title
    var urlDetails = urlParser.parse(iframeUrl);
    var pageTitle = urlDetails.pathname.split('/');
    pageTitle.pop();
    pageTitle = pageTitle.join('/');
    pageTitle = pageTitle.substring(1);

    //update title
    titlebarUpdater.setRoomName(pageTitle);

    //switch rooms
    roomSwitcher && roomSwitcher.change(iframeUrl);
  };

  // Called from the OSX native client for faster page loads
  // when clicking on a chat notification
  window.gitterLoader = function(url) {
    if (url[0] !== '/') {
      url = '/' + url;
    }

    var parsed = urlParser.parse(url);
    linkHandler.routeLink(parsed, { appFrame: true });
  };

  const allRoomsCollection = troupeCollections.troupes;
  new RoomCollectionTracker(allRoomsCollection);

  const onRoomRemoveHandler = function(model) {
    if (model.id === context.getTroupeId()) {
      //context.troupe().set('roomMember', false);
      var newLocation = '/home';
      var newFrame = '/home/~home';
      var title = 'home';

      pushStateWithTitleBar(newLocation, title);
      roomSwitcher && roomSwitcher.change(newFrame);
    }
  };

  allRoomsCollection.on('remove', onRoomRemoveHandler);

  // We remove `onRoomRemoveHandler` so we don't try to redirect to the user home
  // before the `logout()` kicks in (see `delete-account-view.js`)
  appEvents.on('account.delete-start', () => {
    allRoomsCollection.off('remove', onRoomRemoveHandler);
  });
  appEvents.on('account.delete-stop', () => {
    allRoomsCollection.on('remove', onRoomRemoveHandler);
  });

  window.addEventListener(
    'message',
    function(e) {
      if (e.origin !== clientEnv.basePath) {
        debug('Ignoring message from %s', e.origin);
        return;
      }

      var message;
      try {
        message = JSON.parse(e.data);
      } catch (err) {
        /* It seems as through chrome extensions use this event to pass messages too. Ignore them. */
        return;
      }

      debug('Received message %j', message);

      var makeEvent = function(message) {
        var origin = 'chat';
        if (message.event && message.event.origin) origin = message.event.origin;
        message.event = {
          origin: origin,
          preventDefault: function() {},
          stopPropagation: function() {},
          stopImmediatePropagation: function() {}
        };
      };

      switch (message.type) {
        case 'context.troupeId':
          context.setTroupeId(message.troupeId);
          titlebarUpdater.setRoomName(message.name);
          appEvents.trigger('context.troupeId', message.troupeId);
          break;

        case 'navigation':
          appEvents.trigger(
            'navigation',
            message.url,
            message.urlType,
            message.title,
            message.options
          );
          break;

        // case 'route-silent':
        //   var routeCb = router.routes[message.hash];
        //   if(routeCb) {
        //     routeCb.apply(router, message.args);
        //   }
        //   break;

        // No parameters
        case 'chat.edit.hide':
        case 'chat.edit.show':
        case 'ajaxError':
          appEvents.trigger(message.type);
          break;

        case 'keyboard':
          makeEvent(message);
          message.name = message.name || '';
          //patch the event key value as this is needed and seems to get lost
          message.event.key = message.name.split('.').pop();
          appEvents.trigger('keyboard.' + message.name, message.event, message.handler);
          appEvents.trigger('keyboard.all', message.name, message.event, message.handler);
          break;

        case 'focus':
          makeEvent(message);
          appEvents.trigger('focus.request.' + message.focus, message.event);
          break;
      }
    },
    false
  );

  appEvents.on('route', function(hash) {
    window.location.hash = `#${hash}`;
  });

  appEvents.on('navigation', function(url, type, title, options) {
    debug('navigation: %s', url);
    options = options || {};
    var parsed = urlParser.parse(url);
    var frameUrl = parsed.pathname + '/~' + type + parsed.search;

    if (!url && options.refresh) {
      window.location.reload();
      return;
    }

    if (parsed.pathname === window.location.pathname) {
      pushStateWithTitleBar(url, title);

      return;
    }

    //Update windows location
    pushStateWithTitleBar(url, title);

    if (options.disableFrameReload) {
      return;
    }

    if (type === 'iframe') {
      window.location.href = url;
    }

    //Redirect the App
    roomSwitcher && roomSwitcher.change(frameUrl);
  });

  // Call preventDefault() on tab events so that we can manage focus as we want
  appEvents.on('keyboard.tab.next keyboard.tab.prev', function(e) {
    if (!e.origin) e.preventDefault();
  });

  appEvents.on('permalink.requested', function(type, chat /*, options*/) {
    if (context.inOneToOneTroupeContext()) return; // No permalinks to one-to-one chats
    const troupeUrl = context.troupe().get('url');
    const permalinkUrl = generatePermalink(troupeUrl, chat.id);
    pushState(permalinkUrl);
  });

  appEvents.on('unreadItemsCount', function(troupeId, count) {
    if (troupeId !== context.getTroupeId()) {
      debug(
        'troupeId mismatch in unreadItemsCount: got',
        troupeId,
        'expected',
        context.getTroupeId()
      );
    }

    const v = {
      unreadItems: count
    };

    if (count === 0) {
      // If there are no unread items, there can't be unread mentions
      // either
      v.mentions = 0;
    }

    debug('Received unread count message: troupeId=%s, update=%j ', troupeId, v);
    allRoomsCollection.patch(troupeId, v);
  });

  appEvents.on('clearActivityBadge', function(troupeId) {
    allRoomsCollection.patch(troupeId, { activity: 0 });
  });

  if (context.popEvent('invite_failed')) {
    appEvents.trigger('user_notification', {
      title: 'Unable to join room',
      text:
        'Unfortunately we were unable to add you to the requested room. Please ' +
        'check that you have appropriate access and try again.',
      timeout: 12000
    });
  }

  if (context.popEvent('new_user_signup')) {
    require.ensure('scriptjs', function(require) {
      var $script = require('scriptjs');
      $script('//platform.twitter.com/oct.js', function() {
        var twitterOct = window.twttr && window.twttr.conversion;
        // Will no exist if it's been blocked by ad-blockers
        if (!twitterOct) return;
        twitterOct.trackPid('l4t99');
      });
    });
  }

  // Fingerprint the user
  if (context.isLoggedIn()) {
    setTimeout(() => {
      var fingerprint = require('./components/fingerprint');
      fingerprint();
    }, 5000);
  }

  // Register the service worker
  if (context.hasFeature('web-push')) {
    setTimeout(function() {
      require('gitter-web-service-worker/browser/registration').install({
        apiClient: require('./components/api-client')
      });
    }, 10000);
  }

  // Initialize Vue stuff
  require('./vue/initialize-clientside');
});
