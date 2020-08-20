'use strict';
var Marionette = require('backbone.marionette');
var highlight = require('../../utils/highlight');
var behaviourLookup = require('./lookup');

module.exports = (function() {
  var Behavior = Marionette.Behavior.extend({
    modelEvents: {
      'change:highlights': 'onRender'
    },

    onRender: function() {
      if (!this.view.model) return;
      var highlights = this.view.model.get('highlights');

      if (this.highlighted) {
        highlight.removeHighlights(this.view.el);
      }

      if (!highlights || !highlights.length) return;

      this.highlighted = true;
      highlight.highlight(this.view.el, highlights);
    }
  });

  behaviourLookup.register('Highlight', Behavior);
  return Behavior;
})();
