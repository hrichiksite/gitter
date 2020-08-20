'use strict';

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');

module.exports = (function() {
  if (window.__agent) {
    window.__agent.start(Backbone, Marionette);
  }
})();
