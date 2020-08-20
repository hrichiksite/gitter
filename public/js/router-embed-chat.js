'use strict';

var onready = require('./utils/onready');
var context = require('gitter-web-client-context');
var chatCollection = require('./collections/instances/chats');
var EmbedLayout = require('./views/layouts/chat-embed');
var Backbone = require('backbone');
var Router = require('./routes/router');
var roomRoutes = require('./routes/room-routes');
var notificationRoutes = require('./routes/notification-routes');

/* Set the timezone cookie */
require('./components/timezone-cookie');

require('./components/statsc');
require('./views/widgets/preload');
require('./components/dozy');
require('./template/helpers/all');
require('./components/bug-reporting');
require('./components/ping');

// Preload widgets
require('./views/widgets/avatar');

onready(function() {
  var appView = new EmbedLayout({
    el: 'body',
    model: context.troupe(),
    template: false,
    chatCollection: chatCollection
  });
  appView.render();

  new Router({
    dialogRegion: appView.dialogRegion,
    routes: [
      notificationRoutes(),
      roomRoutes({
        rosterCollection: null,
        // TODO: remove these two options:
        // https://github.com/troupe/gitter-webapp/issues/2211
        rooms: null,
        groups: null
      })
    ]
  });

  Backbone.history.start();
});
