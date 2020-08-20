'use strict';

require('./utils/font-setup');

var appEvents = require('./utils/appevents');
var Backbone = require('backbone');
var itemCollections = require('./collections/instances/integrated-items');
var chatCollection = require('./collections/instances/chats');
var PeopleModal = require('./views/modals/people-modal');
var LoginView = require('./views/modals/login-view');
var onready = require('./utils/onready');
var ChatToolbarLayout = require('./views/layouts/chat-toolbar');
var urlParse = require('url-parse');

/* Set the timezone cookie */
require('./components/timezone-cookie');

require('./views/widgets/preload');
require('./components/dozy');
require('./template/helpers/all');
require('./components/bug-reporting');

// Preload widgets
require('./views/widgets/avatar');
require('./components/ping');

onready(function() {
  require('./components/link-handler').installLinkHandler();

  appEvents.on('navigation', function(url) {
    // No pushState here. Open links within the parent...
    window.parent.location.href = url;
  });

  var appView = new ChatToolbarLayout({
    template: false,
    el: 'body',
    chatCollection: chatCollection
  });
  appView.render();

  var Router = Backbone.Router.extend({
    routes: {
      '': 'hideModal',
      people: 'people',
      login: 'login'
    },

    hideModal: function() {
      appView.dialogRegion.destroy();
    },

    people: function() {
      appView.dialogRegion.show(
        new PeopleModal({
          rosterCollection: itemCollections.roster
        })
      );
    },

    login: function(query) {
      var options = query ? urlParse('?' + query, true).query : {};
      appView.dialogRegion.show(new LoginView(options));
    }
  });

  var router = new Router();

  appEvents.on('loginClicked', function(route) {
    router.navigate(route, { trigger: true });
  });

  // // Listen for changes to the room
  // liveContext.syncRoom();

  Backbone.history.stop();
  Backbone.history.start();
});
