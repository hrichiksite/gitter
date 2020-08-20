'use strict';

var appEvents = require('../utils/appevents');

function shimImplemtation() {
  var timers = {};
  return {
    start: function(name) {
      timers[name] = Date.now();
    },

    end: function(name) {
      var value = timers[name];
      delete timers[name];

      if (!value) return;
      appEvents.trigger('stats.time', name, Date.now() - value);

      return value;
    }
  };
}

function perfImplementation() {
  var performance = window.performance;

  var marks = {};
  var PREFIX = 'gitter_';

  setInterval(function() {
    var items = performance.getEntriesByType('measure');

    if (!items) return;

    for (var i = 0; i < items.length; i++) {
      var req = items[i];
      if (req.name.indexOf(PREFIX) !== 0) return;
      var statName = req.name.substring(PREFIX.length);
      var duration = req.duration;

      if (duration) {
        appEvents.trigger('stats.time', statName, duration);
      }

      performance.clearMeasures(req.name);
    }
  }, 3000);

  return {
    start: function(name) {
      marks[name] = true;
      performance.mark(PREFIX + name + '_start');
    },

    end: function(name) {
      var markName;
      var hasMark = marks[name];
      if (hasMark) {
        delete marks[name];
        markName = PREFIX + name + '_start';
      } else {
        markName = performance.domContentLoadedEventStart;
      }

      // Because IE11 and MS Edge will throw a syntax error
      // with an undefined 3 parameter
      // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/4933422/
      // https://connect.microsoft.com/IE/feedback/details/1884529/bug-in-html5-performance-api
      try {
        performance.measure(PREFIX + name, markName);
      } catch (err) {
        //...
      }
    }
  };
}

var implementation;
if (window.performance && window.performance.mark && window.performance.measure) {
  implementation = perfImplementation();
} else {
  implementation = shimImplemtation();
}
module.exports = implementation;
