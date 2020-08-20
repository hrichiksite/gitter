'use strict';

var Marionette = require('backbone.marionette');
var context = require('gitter-web-client-context');
var ModalView = require('../modals/modal');
var AvatarView = require('../widgets/avatar');
var collectionTemplate = require('./tmpl/peopleCollectionView.hbs');
var remainingTempate = require('./tmpl/remainingView.hbs');

require('../behaviors/isomorphic');

var PeopleCollectionView = Marionette.CollectionView.extend({
  tagName: 'ul',
  className: 'roster',
  childView: AvatarView,
  childViewOptions: function(item) {
    var options = {
      tagName: 'li',
      showStatus: true,
      tooltipPlacement: 'left',
      screenReadUsername: true
    };

    if (item && item.id) {
      var prerenderedUserEl = this.$el.find('.js-model-id-' + item.id)[0];
      if (prerenderedUserEl) {
        options.el = prerenderedUserEl;
      }
    }

    return options;
  },
  collectionEvents: {
    reset: 'onCollectionReset'
  },
  onCollectionReset: function() {
    if (this.collection.length) return;

    var el = this.el;

    var child;
    while ((child = el.firstChild)) {
      el.removeChild(child);
    }
  }
});

var RemainingView = Marionette.ItemView.extend({
  className: 'remaining',

  template: remainingTempate,

  modelEvents: {
    'change:id': 'render'
  },

  serializeData: function() {
    var userCount = this.model.get('userCount');
    var isOneToOne = this.model.get('oneToOne');
    var isLoggedIn = context.isLoggedIn();

    return {
      showAddButton: isLoggedIn && !isOneToOne,
      showPeopleButton: !isOneToOne,
      userCount: userCount,
      hasHiddenMembers: userCount > 25
    };
  }
});

var ExpandableRosterView = Marionette.LayoutView.extend({
  template: collectionTemplate,

  behaviors: {
    Isomorphic: {
      rosterRegion: { el: '#roster-region', init: 'initRosterRegion' },
      remainingRegion: { el: '#remaining-region', init: 'initRemainingRegion' }
    }
  },

  initRosterRegion: function(optionsForRegion) {
    return new PeopleCollectionView(
      optionsForRegion({
        collection: this.options.rosterCollection,
        filter: function(child, index) {
          // jshint unused:true
          return index < 25; // Only show the first 25 users
        }
      })
    );
  },

  initRemainingRegion: function(optionsForRegion) {
    return new RemainingView(
      optionsForRegion({
        model: context.troupe()
      })
    );
  }
});

var AllUsersModal = ModalView.extend({
  initialize: function(options) {
    options = options || {};
    options.title = 'People';
    ModalView.prototype.initialize.call(this, options);
    this.view = new PeopleCollectionView(options);
  }
});

module.exports = {
  ExpandableRosterView: ExpandableRosterView,
  Modal: AllUsersModal
};
