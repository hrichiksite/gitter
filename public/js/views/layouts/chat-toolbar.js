'use strict';

var $ = require('jquery');
var context = require('gitter-web-client-context');
var appEvents = require('../../utils/appevents');
var ChatLayout = require('./chat');
var HeaderView = require('../app/headerView');
var rightToolbarModel = require('../../models/right-toolbar-model');
var RightToolbarView = require('../righttoolbar/rightToolbarView');

require('../behaviors/isomorphic');

module.exports = ChatLayout.extend({
  events: {
    'click .chat-input-nli a[href^="/login"]': 'clickLogin'
  },

  clickLogin: function(e) {
    e.preventDefault();
    var href = $(e.currentTarget).attr('href');
    var route = 'login' + href.slice(href.indexOf('?'));
    appEvents.trigger('loginClicked', route);
  },

  behaviors: {
    Isomorphic: {
      chat: {
        el: '#content-wrapper',
        init: 'initChatRegion' // Declared in super
      },
      toolbar: {
        el: '#right-toolbar-layout',
        init: 'initToolbarRegion'
      },
      header: {
        el: '#header-wrapper',
        init: 'initHeaderRegion'
      }
    }
  },

  initToolbarRegion: function(optionsForRegion) {
    return new RightToolbarView(
      optionsForRegion({
        model: rightToolbarModel
      })
    );
  },

  initHeaderRegion: function(optionsForRegion) {
    return new HeaderView(
      optionsForRegion({
        model: context.troupe()
      })
    );
  }
});
