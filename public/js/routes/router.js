'use strict';

var Backbone = require('backbone');
var _ = require('lodash');

var Router = Backbone.Router.extend({
  constructor: function(options) {
    this.dialogRegion = options.dialogRegion;

    var routes = {
      '': 'hideModal'
    };

    options.routes.forEach(function(r) {
      _.extend(routes, r);
    });

    Backbone.Router.call(this, _.extend(options, { routes: routes }));
  },

  hideModal: function() {
    this.dialogRegion.destroy();
  }
});

module.exports = Router;
