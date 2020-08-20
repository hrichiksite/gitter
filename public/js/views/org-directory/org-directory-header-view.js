'use strict';

var Marionette = require('backbone.marionette');
var toggleClass = require('../../utils/toggle-class');
var context = require('gitter-web-client-context');

var ProfileMenu = require('../../views/profile-menu/profile-menu-view.js');
var headerViewTemplate = require('./org-directory-header-view.hbs');

require('../behaviors/isomorphic');
require('../behaviors/tooltip');

var HeaderView = Marionette.LayoutView.extend({
  el: 'header',
  template: headerViewTemplate,

  ui: {
    favourite: '.js-group-favourite-button',
    favouriteIcon: '.js-group-favourite-button-icon'
  },

  events: {
    'click @ui.favourite': 'onFavouriteButtonClicked'
  },

  modelEvents: {
    'change:favourite': 'onFavouriteChange'
  },

  behaviors: function() {
    var behaviors = {
      Isomorphic: {},
      Tooltip: {
        '.js-group-favourite-button': { placement: 'left' }
      }
    };

    if (context.isLoggedIn()) {
      behaviors.Isomorphic.profileMenuView = {
        el: '#profile-menu',
        init: 'initProfileMenuView'
      };
    }

    return behaviors;
  },

  initProfileMenuView: function(optionsForRegion) {
    this.profileMenuView = new ProfileMenu(
      optionsForRegion({
        // ...
      })
    );
    return this.profileMenuView;
  },

  onFavouriteChange: function() {
    var isFavourited = !!this.model.get('favourite');
    toggleClass(this.ui.favouriteIcon[0], 'favourite', isFavourited);
  },

  onFavouriteButtonClicked: function() {
    var isFavourited = !!this.model.get('favourite');
    this.model.save(
      {
        favourite: !isFavourited
      },
      {
        wait: true,
        patch: true
      }
    );
  }
});

module.exports = HeaderView;
