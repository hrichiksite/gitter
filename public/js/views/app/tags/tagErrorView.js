'use strict';

var Marionette = require('backbone.marionette');
var tagErrorTemplate = require('./tmpl/tagErrorTemplate.hbs');

var TagErrorView = Marionette.ItemView.extend({
  template: tagErrorTemplate,

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  }
});

module.exports = TagErrorView;
