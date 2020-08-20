'use strict';

var $ = require('jquery');
var Marionette = require('backbone.marionette');
var urlParse = require('url-parse');
var appEvents = require('../../utils/appevents');
var context = require('gitter-web-client-context');
var modalRegion = require('../../components/modal-region');
var LoginView = require('../modals/login-view');
var ProfileMenu = require('../profile-menu/profile-menu-view');
var template = require('./tmpl/explore-view.hbs');
var itemTemplate = require('../../../templates/partials/room_card.hbs');
var clientEnv = require('gitter-client-env');

require('../behaviors/isomorphic');

var TagPillView = Marionette.ItemView.extend({
  template: itemTemplate,
  tagName: 'li',
  events: {
    click: 'onClick'
  },
  initialize: function() {
    //console.log('tagPillView init');
  },

  onClick: function() {
    //console.log('click tag pill');
  }
});

var TagPillListView = Marionette.CollectionView.extend({
  childView: TagPillView,
  initialize: function() {
    //console.log('tagPillListView init');
  }
});

var RoomCardView = Marionette.ItemView.extend({
  template: itemTemplate,
  tagName: 'div',

  popEditTagsModal: function() {
    require.ensure(['../modals/edit-tags-view'], function(require) {
      var EditTagsView = require('../modals/edit-tags-view');
      var editTagsModal = new EditTagsView({
        roomId: 0 // FIXME: the room id
      });
      editTagsModal.show();
    });
  }
});

var RoomCardListView = Marionette.CollectionView.extend({
  childView: RoomCardView,
  initialize: function() {
    //console.log('roomCardListView init');
  }
});

var ExploreView = Marionette.LayoutView.extend({
  template: template,
  behaviors: {
    Isomorphic: {
      tagPillList: {
        el: '.js-explore-tag-pill-list',
        init: 'initTagPillListView'
      },
      roomCardList: {
        el: '.js-room-card-list',
        init: 'initRoomCardListView'
      }
    }
  },
  regions: {
    dialogRegion: 'body'
  },
  ui: {
    leftMenuToggle: '.js-header-view-left-menu-toggle',
    signInButton: '.js-sign-in',
    createRoomButton: '.js-explore-create-button'
  },
  events: {
    'click @ui.leftMenuToggle': 'onLeftMenuToggleClick',
    'click @ui.signInButton': 'popSignInModal',
    'click @ui.createRoomButton': 'popCreate'
  },

  initRoomCardListView: function(optionsForRegion) {
    return new RoomCardListView(optionsForRegion({}));
  },
  initTagPillListView: function(optionsForRegion) {
    return new TagPillListView(optionsForRegion({}));
  },

  initialize: function() {
    // TODO: Once we re-render on the client with a snapshot, this stuff can be removed
    $('.js-explore-tag-pill[data-needs-authentication]').on('click', this.popSignInModal);
    this.setupProfileMenu();
  },

  serializeData: function() {
    var headlineNumbers = clientEnv.headlineNumbers || {};

    return {
      isLoggedIn: context.isLoggedIn(),
      headlineGitterUsers: headlineNumbers.gitterUsers,
      headlineGitterRooms: headlineNumbers.gitterRooms,
      headlineGitterGroups: headlineNumbers.gitterGroups,
      headlineGitterCountries: headlineNumbers.gitterCountries
    };
  },

  onRender: function() {
    this.setupProfileMenu();
  },

  setupProfileMenu: function() {
    if (context.isLoggedIn()) {
      //If an instance of the profile menu exists destroy it to remove listeners etc
      if (this.profileMenu) {
        this.profileMenu.destroy();
      }
      //Make a new profile menu
      this.profileMenu = new ProfileMenu({ el: '#profile-menu' });
      //Render it
      this.profileMenu.render();
    }
  },

  onLeftMenuToggleClick() {
    appEvents.trigger('dispatchVueAction', 'toggleLeftMenu', true);
  },

  popSignInModal: function(e) {
    var href = $(e.currentTarget).attr('href');
    var parsedUrl = urlParse(href, true);

    var modal = new LoginView(parsedUrl.query);
    modalRegion.show(modal);
    // hack this modal because we're not using history or routing here
    modal.navigable = false;

    e.preventDefault();
  },

  popCreate: function() {
    appEvents.trigger('route', 'createcommunity');
  }
});

module.exports = ExploreView;
