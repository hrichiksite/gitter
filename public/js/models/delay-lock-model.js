'use strict';

var Backbone = require('backbone');

var DelayLock = Backbone.Model.extend({
  defaults: {
    locked: true,
    // give enough time to read the warnings
    secondsLeft: 8,
    error: null
  },
  initialize: function() {
    this.tick();
  },
  tick: function() {
    var self = this;
    if (!this.get('locked')) return;

    setTimeout(function() {
      var seconds = self.get('secondsLeft') - 1;
      self.set('secondsLeft', seconds);

      if (seconds <= 0) {
        self.set('locked', false);
      } else {
        self.tick();
      }
    }, 1000);
  }
});

module.exports = DelayLock;
