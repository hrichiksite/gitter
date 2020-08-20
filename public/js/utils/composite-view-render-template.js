'use strict';

var Marionette = require('backbone.marionette');

//Marionette has not released https://github.com/marionettejs/backbone.marionette/pull/2565
//so this is needed JP 17/2/16
module.exports = function compositeViewRenderTemplate() {
  var data = {};
  data = this.serializeData();
  data = this.mixinTemplateHelpers(data);

  this.triggerMethod('before:render:template');

  var template = this.getTemplate();
  if (template !== false) {
    var html = Marionette.Renderer.render(template, data, this);
    this.attachElContent(html);
  }

  // the ui bindings is done here and not at the end of render since they
  // will not be available until after the model is rendered, but should be
  // available before the collection is rendered.
  this.bindUIElements();
  this.triggerMethod('render:template');
};
