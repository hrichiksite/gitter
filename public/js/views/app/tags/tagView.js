'use strict';

var Marionette = require('backbone.marionette');
var tagTemplate = require('./tmpl/tagTemplate.hbs');

var TagView = Marionette.ItemView.extend({
  template: tagTemplate,

  events: {
    click: 'onTagClicked'
  },

  onTagClicked: function() {
    this.triggerMethod('remove:tag', this.model);
  }
});

module.exports = TagView;
