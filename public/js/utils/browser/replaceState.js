'use strict';

const debug = require('debug-proxy')('app:replace-state');
const appEvents = require('../appevents');

/**
 * Updates the browser address bar and sends a track event
 */
module.exports = (url, title = undefined) => {
  debug(`${url}`);
  window.history.replaceState(url, title || window.title, url);
  appEvents.trigger('track', url);
};
