'use strict';

var Marionette = require('backbone.marionette');
var Typeahead = require('../controls//typeahead');
var SimpleFilteredCollection = require('gitter-realtime-client/lib/simple-filtered-collection');

var FilteredSelect = Marionette.ItemView.extend({
  events: {
    focus: 'onActivate',
    blur: 'hide',
    click: 'onActivate'
  },

  initialize: function(options) {
    this.filter = options.filter;
    this.collection = options.collection;
    this.itemTemplate = options.itemTemplate;
    this.dropdownClass = options.dropdownClass;

    this.filteredCollection = new SimpleFilteredCollection([], {
      collection: this.collection
    });
    this.refilter('', this.filteredCollection);

    this.typeahead = new Typeahead({
      el: this.el,
      disableShowOnAdd: true,
      disableListenToChange: true,
      longDebounce: 200,
      shortDebounce: 50,
      collection: this.filteredCollection,
      itemTemplate: this.itemTemplate,
      dropdownClass: this.dropdownClass,
      fetch: this.refilter.bind(this),
      autoSelector: function(input) {
        return function(model) {
          this.filter(input, model);
        }.bind(this);
      }.bind(this)
    });

    this.listenTo(this.typeahead, 'selected', this.selected);
    this.listenTo(this.collection, 'add remove change reset sync', this.reset);
  },

  getSelected: function() {
    return this.selectedGroup;
  },

  selected: function(item) {
    this.hide();
    this.trigger('selected', item);
  },

  onDestroy: function() {
    this.typeahead.destroy();
  },

  onActivate: function() {
    if (this.el.value) {
      this.show();
    }
  },

  show: function() {
    if (this.typeahead) {
      this.typeahead.show();
    }
  },

  hide: function() {
    if (this.typeahead) {
      this.typeahead.hide();
    }
  },

  refilter: function(input, collection, success) {
    collection.setFilter(
      function(model) {
        return this.filter(input, model);
      }.bind(this)
    );

    if (success) success();
  }
});

module.exports = FilteredSelect;
