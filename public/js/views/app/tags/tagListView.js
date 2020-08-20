'use strict';

var Marionette = require('backbone.marionette');
var TagView = require('./tagView');

var TagListView = Marionette.CollectionView.extend({
  childView: TagView,
  childEvents: {
    'remove:tag': 'onRemoveTag'
  },

  onRemoveTag: function(view, model) {
    this.collection.remove(model);
    this.triggerMethod('tag:removed');
  }
});

module.exports = TagListView;
