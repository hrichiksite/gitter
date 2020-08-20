'use strict';
var _ = require('lodash');

var liveSearch = function(view, $el, method, options) {
  var lastValue;

  var longDebounceValue = (options && options.longDebounce) || 800;
  var shortDebounceValue = (options && options.shortDebounce) || 400;
  var immediate = options && options.immediate;
  var disableListenToChange = options && options.disableListenToChange;

  var fastDebounce = _.debounce(function() {
    var currentValue = $el.val();

    if (currentValue !== lastValue) {
      lastValue = currentValue;
      if (_.isFunction(method)) {
        method.call(view, currentValue);
      } else {
        view[method](currentValue);
      }
    }
  }, shortDebounceValue);

  var slowDebounce = _.debounce(fastDebounce, longDebounceValue);

  var change = function(e) {
    var currentValue = e.target.value;

    if (immediate) {
      if (_.isFunction(immediate)) {
        immediate.call(view, currentValue);
      } else {
        view[immediate](currentValue);
      }
    }

    if (currentValue.length < 3) {
      slowDebounce();
    } else {
      fastDebounce();
    }
  }.bind(view);

  // Build the string of events we listen to
  var elEventChangeString = 'cut paste input';
  if (!disableListenToChange) {
    elEventChangeString += ' change';
  }
  $el.on(elEventChangeString, change);

  view.on('destroy', function() {
    $el.off(elEventChangeString, change);
  });
};

module.exports = liveSearch;
