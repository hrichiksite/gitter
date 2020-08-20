'use strict';

var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var loadingTemplate = require('./tmpl/loading.hbs');

var LoadingView = Marionette.ItemView.extend({
  template: loadingTemplate
});

// TODO: move this to a behavior
// Mixin for Marionette.CollectionView classes
module.exports = {
  loadingView: LoadingView,
  initialize: function() {
    this.showEmptyView = this.showLoadingView;
  },
  showLoadingView: function() {
    if (this.collection.loading) {
      var LoadingView = Marionette.getOption(this, 'loadingView');

      if (!this.loadingModel) {
        this.loadingModel = new Backbone.Model();
      }

      var v = this.children.findByModel(this.loadingModel);

      if (LoadingView && !v) {
        this.addChild(this.loadingModel, LoadingView, 0);
        this.listenToOnce(this.collection, 'loaded', function() {
          this.removeChildView(this.loadingModel);

          if (this.collection.length === 0) {
            this.constructor.prototype.showEmptyView.call(this);
            return true;
          }
        });
      }
      return true;
    }

    this.constructor.prototype.showEmptyView.call(this);
    return true;
  }
};
