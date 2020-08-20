'use strict';
var _ = require('lodash');
var appEvents = require('../utils/appevents');
require('../components/keyboard-events');

module.exports = (function() {
  // Bind `keyboardEvents` names to functions or method names, as you would with Backbones' `events`
  // See/change components/keyboard-events for events listeners

  return {
    initialize: function() {
      var events;
      if (!(events = _.result(this, 'keyboardEvents'))) return;

      var self = this;
      var eventSplitter = /\s+/;

      var _listen = function(key, method) {
        if (!_.isFunction(method)) method = self[method];
        if (method) {
          self.listenTo(appEvents, 'keyboard.' + key, method, self);
        }
      };

      _.each(events, function(method, key) {
        if (eventSplitter.test(key)) {
          var keys = key.split(eventSplitter);
          _.each(keys, function(k) {
            _listen(k, method);
          });
        } else {
          _listen(key, method);
        }
      });
    }
  };
})();
