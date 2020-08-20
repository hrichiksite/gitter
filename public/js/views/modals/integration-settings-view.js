'use strict';

var Marionette = require('backbone.marionette');
var context = require('gitter-web-client-context');
var ModalView = require('./modal');
var template = require('./tmpl/integration-settings-view.hbs');

var View = Marionette.ItemView.extend({
  template: template,

  serializeData: function() {
    var data = context.getTroupe();
    // FIXME: Just rename it so it doesn't include the `url` module: https://github.com/altano/handlebars-loader/issues/75
    data.stub = data.url;
    return data;
  }
});

module.exports = ModalView.extend({
  initialize: function(options) {
    options.title = 'Integration Settings';
    ModalView.prototype.initialize.apply(this, arguments);
    this.view = new View({});
  }
});
