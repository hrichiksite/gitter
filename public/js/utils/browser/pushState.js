'use strict';

const debug = require('debug-proxy')('app:push-state');
const appEvents = require('../appevents');

/**
 * Updates the browser address bar and sends a track event,
 * doesn't do anything if the address bar already contains the url
 */
module.exports = (url, title = undefined) => {
  // Don't repush the same state
  const isSameState = url === window.history.state;
  debug(`${url} (isSameState=${isSameState})`);
  if (isSameState) return; // don't navigate if the state hasn't changed
  window.history.pushState(url, title || window.title, url);
  appEvents.trigger('track', url);
};
