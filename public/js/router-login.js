'use strict';

var $ = require('jquery');
var Backbone = require('backbone');
var onready = require('./utils/onready');
var appEvents = require('./utils/appevents');
var LoginView = require('./views/modals/login-view');
var modalRegion = require('./components/modal-region');
var urlParse = require('url-parse');

require('./utils/tracking');
require('./template/helpers/all');
require('./views/widgets/preload');
require('./components/timezone-cookie');
require('./components/bug-reporting');
require('./components/ping');

onready(function() {
  require('./components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    window.location = url;
  });

  var Router = Backbone.Router.extend({
    routes: {
      '': 'hideModal',
      login: 'login'
    },

    hideModal: function() {
      modalRegion.destroy();
    },

    login: function(query) {
      var options = query ? urlParse('?' + query, true).query : {};
      modalRegion.show(new LoginView(options));
    }
  });

  var router = new Router();

  Backbone.history.start();

  $('.login').on('click', 'a[href^="/login"]', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var href = $(e.currentTarget).attr('href');
    var route = 'login' + href.slice(href.indexOf('?'));
    router.navigate(route, { trigger: true });
  });
});
