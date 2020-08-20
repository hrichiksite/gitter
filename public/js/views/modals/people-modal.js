'use strict';

var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var _ = require('lodash');
var ModalView = require('./modal');
var itemTemplate = require('./tmpl/people-modal-result.hbs');
var apiClient = require('../../components/api-client');
var template = require('./tmpl/people-modal.hbs');
var SyncMixin = require('../../collections/sync-mixin');
var InfiniteScrollBehavior = require('../behaviors/infinite-scroll');
var context = require('gitter-web-client-context');

require('../behaviors/widgets');

var RESULT_LIMIT = 25;

var UserCollection = Backbone.Collection.extend({
  searchTerm: '',
  isFetched: false,
  limit: RESULT_LIMIT,
  url: apiClient.room.channelGenerator('/users'),
  sync: SyncMixin.sync,
  fetchMoreBefore: function() {},
  fetchMoreAfter: function() {
    // already fetching or no more results to fetch
    if (this.limit > this.length) return;

    this.limit = this.limit + 25;

    this.fetchWithLimit();
  },
  search: function(term) {
    this.searchTerm = term || '';
    // reset result limit for new search
    this.limit = RESULT_LIMIT;

    this.fetchWithLimit();
  },
  fetchWithLimit: function() {
    var self = this;

    var data = { limit: this.limit };
    if (this.searchTerm) {
      data.q = this.searchTerm;
    }

    this.fetch({
      data: data,
      success: function() {
        self.isFetched = true;
      }
    });
  }
});

var UserView = Marionette.ItemView.extend({
  tagName: 'li',
  className: 'people-modal-result',
  template: itemTemplate,
  modelEvents: {
    change: 'render'
  },
  behaviors: {
    Widgets: {}
  }
});

var EmptyView = Marionette.ItemView.extend({
  className: 'people-modal-empty',
  serializeData: function() {
    return { isFetched: this.collection.isFetched };
  },
  template: function(data) {
    // wait until results come back to give negative feedback
    return data.isFetched ? '<h3>Nope, nothing :(</h3>' : '';
  }
});

var View = Marionette.CompositeView.extend({
  className: 'people-modal',
  template: template,
  ui: {
    search: 'input',
    clear: '.js-people-modal-search-clear',
    results: 'ul'
  },
  childViewContainer: '@ui.results',
  childView: UserView,
  emptyView: EmptyView,
  events: {
    'input @ui.search': 'onSearchInput',
    'click @ui.clear': 'clearSearch'
  },
  reorderOnSort: true,
  initialize: function() {
    var self = this;

    this.debouncedSearch = _.debounce(function() {
      var term = self.ui.search.val();
      self.collection.search(term);
    }, 250);

    this.once(
      'render',
      function() {
        new InfiniteScrollBehavior({ scrollElement: this.ui.results[0] }, this);
      },
      this
    );
  },
  emptyViewOptions: function() {
    return { collection: this.collection };
  },
  onSearchInput: function() {
    if (this.ui.search.val()) {
      this.ui.clear.show();
    } else {
      this.ui.clear.hide();
    }

    this.debouncedSearch();
  },
  clearSearch: function() {
    this.ui.search.val('');
    this.collection.search('');
    this.ui.clear.hide();
  }
});

var Modal = ModalView.extend({
  initialize: function(options) {
    options = options || {};
    options.title = 'People';

    var room = context.troupe();

    var users = new UserCollection(options.rosterCollection.models);
    users.fetchWithLimit();
    // make the user collection seem live
    users.listenTo(room, 'change:userCount', users.fetchWithLimit);

    ModalView.prototype.initialize.call(this, options);
    this.view = new View({ collection: users });
  }
});

module.exports = Modal;
