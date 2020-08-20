'use strict';
var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');

module.exports = (function() {
  var Behavior = Marionette.Behavior.extend({
    modelEvents: {
      'change:lastMessageSeen': 'onRender'
    },

    onRender: function() {
      if (!this.view.model) return;
      if (!this.view.model.get('lastMessageSeen')) return;

      this.view.$el.addClass('lastMessageSeen');
    }
  });

  behaviourLookup.register('LastMessageSeen', Behavior);
  return Behavior;
})();
