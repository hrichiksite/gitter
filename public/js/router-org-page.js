'use strict';

require('./utils/font-setup');

var _ = require('lodash');
var Backbone = require('backbone');
var urlJoin = require('url-join');
var clientEnv = require('gitter-client-env');
var onReady = require('./utils/onready');
var context = require('gitter-web-client-context');
var appEvents = require('./utils/appevents');
var realtime = require('./components/realtime');
var SyncMixin = require('./collections/sync-mixin');
var modalRegion = require('./components/modal-region');

var OrgDirectoryLayout = require('./views/layouts/org-directory-layout');

require('@gitterhq/styleguide/css/components/buttons.css');
require('@gitterhq/styleguide/css/components/headings.css');

require('./utils/tracking');

onReady(function() {
  require('./components/link-handler').installLinkHandler();

  //We are always within an iFrame to we can
  //change the parent url with NO FEAR!
  appEvents.on('navigation', function(url) {
    window.parent.location.assign(url);
  });

  //listen for postMessageCalls
  window.addEventListener('message', function onWindowMessage(message /*, targetOrigin*/) {
    if (message.origin !== clientEnv['basePath']) return;

    var data;
    if (_.isString(message.data)) {
      try {
        data = JSON.parse(message.data);
      } catch (e) {
        //TODO: JP 8/9/15 Should so something with this error
        data = message.data;
      }
    } else {
      data = message.data;
    }
    if (data.type !== 'change:room') return;
    window.location.replace(data.url);
  });

  var Router = Backbone.Router.extend({
    routes: {
      '': 'index'
    },

    index: function() {
      modalRegion.destroy();
      //FIXME: ugly hack to refresh the server rendered page once
      //a user has added tags to a room
      //jp 3/9/15
      window.location.reload();
    }
  });

  new Router();
  Backbone.history.stop();
  Backbone.history.start({ silent: true });

  var group = context.group();
  var user = context.user();

  var GroupModel = Backbone.Model.extend({
    url: function() {
      return urlJoin('/v1/user/', user.get('id'), '/groups/', this.get('id'));
    },
    client: function() {
      return realtime.getClient();
    },
    sync: SyncMixin.sync
  });

  var orgDirectoryLayout = new OrgDirectoryLayout({
    template: false,
    el: 'body',
    group: new GroupModel(group.attributes)
  });
  orgDirectoryLayout.render();
});
