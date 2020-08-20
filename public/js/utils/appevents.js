'use strict';
var _ = require('lodash');
var Backbone = require('backbone');
var clientEnv = require('gitter-client-env');

var basePath = clientEnv['basePath'];
/*
 *
 * This is the new application-wide message bus. Use it instead of jquery $(document).on(...)
 * As we can use Backbone style listenTo() event listening with it
 */
var appEvents = {
  triggerParent: function() {
    var args = Array.prototype.slice.call(arguments, 0);
    if (typeof window !== 'undefined') {
      window.postMessage(
        JSON.stringify({
          child_window_event: args
        }),
        basePath
      );
    }
  }
};

_.extend(appEvents, Backbone.Events);

if (typeof window !== 'undefined') {
  window.addEventListener(
    'message',
    function(e) {
      if (e.origin !== basePath) return;
      var data;
      try {
        data = JSON.parse(e.data);
      } catch (err) {
        // Ignore badly formatted messages from extensions
        return;
      }

      if (data.child_window_event) {
        data.child_window_event.push(e);
        appEvents.trigger.apply(appEvents, data.child_window_event);
      }
    },
    false
  );
}

module.exports = appEvents;
