'use strict';

var pageVisibility = require('../utils/page-visibility');
var passiveEventListener = require('../utils/passive-event-listener');

function EyeballsVisibility(callback) {
  // TODO: consider removing these now that we're using
  // pageVisibility
  passiveEventListener.addEventListener(window, 'pageshow', function() {
    callback(true);
  });

  passiveEventListener.addEventListener(window, 'pagehide', function() {
    callback(false);
  });

  pageVisibility.events.on('change', function() {
    if (pageVisibility.isHidden()) {
      callback(false);
    } else {
      callback(true);
    }
  });
}

module.exports = EyeballsVisibility;
