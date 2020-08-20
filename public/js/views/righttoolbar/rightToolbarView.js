'use strict';

var Marionette = require('backbone.marionette');
var _ = require('lodash');
var context = require('gitter-web-client-context');
var toggleClass = require('../../utils/toggle-class');
var itemCollections = require('../../collections/instances/integrated-items');
var PeopleCollectionView = require('../people/peopleCollectionView');
var RepoInfoView = require('./repoInfo');
var ActivityCompositeView = require('./activityCompositeView');
var RepoInfoModel = require('../../collections/repo-info');
const appEvents = require('../../utils/appevents');

require('../behaviors/isomorphic');

var RightToolbarLayout = Marionette.LayoutView.extend({
  className: 'right-toolbar right-toolbar--collapsible',
  behaviors: {
    Isomorphic: {
      repo_info: { el: '#repo-info', init: 'initRepo_infoRegion' },
      activity: { el: '#activity-region', init: 'initActivityRegion' },
      roster: { el: '#people-roster', init: 'initRosterRegion' }
    }
  },

  ui: {
    header: '#toolbar-top-content',
    footer: '#zendesk-footer',
    rosterHeader: '#people-header',
    repoInfoHeader: '#info-header',
    toggleIcon: '.js-menu-toggle-icon'
  },

  events: {
    'click #upgrade-auth': 'onUpgradeAuthClick',
    'click #people-header': 'showPeopleList',
    'click #info-header': 'showRepoInfo',
    'submit #upload-form': 'upload',
    'click @ui.toggleIcon': 'toggleMenu'
  },

  childEvents: {
    'repoInfo:changeVisible': 'repoInfoChangeVisible'
  },

  collectionEvents: {
    'add sync reset remove': 'onCollectionUpdate'
  },

  modelEvents: {
    'change:isPinned': 'onPanelPinStateChange'
  },

  constructor: function() {
    this.collection = itemCollections.roster;
    Marionette.LayoutView.prototype.constructor.apply(this, arguments);
  },

  initialize: function(attrs) {
    this.iconOpts = _.extend({}, this.defaults, attrs.icon || {});
    this.iconHover = false;
    this.listenTo(context.troupe(), 'change:id', this.onRoomChange, this);
    appEvents.on('vue:right-toolbar:toggle', isVisible => this.toggleToolbar(isVisible));
    toggleClass(this.el, 'collapsed', !this.model.get('isPinned'));
  },

  initRepo_infoRegion: function(optionsForRegion) {
    // Repo info
    return new RepoInfoView(
      optionsForRegion({
        model: new RepoInfoModel(),
        roomModel: context.troupe()
      })
    );
  },

  initActivityRegion: function(optionsForRegion) {
    return new ActivityCompositeView(
      optionsForRegion({
        collection: itemCollections.events
      })
    );
  },

  initRosterRegion: function(optionsForRegion) {
    return new PeopleCollectionView.ExpandableRosterView(
      optionsForRegion({
        rosterCollection: itemCollections.roster
      })
    );
  },

  onPanelPinStateChange: function() {
    toggleClass(this.el, 'collapsed', !this.model.get('isPinned'));
  },

  showPeopleList: function() {
    this.repo_info.$el.hide();
    this.roster.$el.show();
    this.ui.rosterHeader.addClass('selected');
    this.ui.repoInfoHeader.removeClass('selected');
  },

  showRepoInfo: function() {
    this.roster.$el.hide();
    this.repo_info.$el.show();
    this.ui.rosterHeader.removeClass('selected');
    this.ui.repoInfoHeader.addClass('selected');
  },

  repoInfoChangeVisible: function(child, visible) {
    //hide the 'REPO INFO' tab if we are not in a repo room
    this.ui.repoInfoHeader.toggleClass('hidden', !visible);

    //move back to the people list if we are showing repo info for a non repo room
    if (this.ui.repoInfoHeader.hasClass('selected') && !visible) {
      this.showPeopleList();
    }
  },

  onCollectionUpdate: function() {
    var peopleList = this.$el.find('#people-list');
    peopleList.toggleClass('hidden', !this.collection.length);
  },

  toggleMenu: function() {
    this.model.set('isPinned', !this.model.get('isPinned'));
  },

  toggleToolbar: function(newVisibleState) {
    toggleClass(this.el, 'hidden', !newVisibleState);
  }
});

module.exports = RightToolbarLayout;
