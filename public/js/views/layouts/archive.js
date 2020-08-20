'use strict';

var context = require('gitter-web-client-context');
var ChatLayout = require('./chat');
var HeaderView = require('../app/headerView');
var ArchiveNavigationView = require('../archive/archive-navigation-view');

require('../behaviors/isomorphic');

module.exports = ChatLayout.extend({
  behaviors: {
    Isomorphic: {
      chat: {
        el: '#content-wrapper',
        init: 'initChatRegion' // Declared in super
      },
      navigation: {
        el: '#archive-navigation',
        init: 'initArchiveNavigation'
      },
      header: {
        el: '#header-wrapper',
        init: 'initHeaderRegion'
      }
    }
  },

  initArchiveNavigation: function(optionsForRegion) {
    return new ArchiveNavigationView(
      optionsForRegion({
        archiveContext: context().archive
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
