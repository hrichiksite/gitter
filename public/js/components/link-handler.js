'use strict';

var $ = require('jquery');
var context = require('gitter-web-client-context');
var clientEnv = require('gitter-client-env');
const debug = require('debug-proxy')('app:link-handler');
var appEvents = require('../utils/appevents');
var isValidRoomUri = require('../utils/valid-room-uri');
var dataset = require('../utils/dataset-shim');

function routeLink(target, options) {
  var targetOrigin = target.protocol + '//' + target.host;
  var internalLink = targetOrigin === clientEnv['basePath'];

  var location = window.location;
  var appFrame = options && options.appFrame;
  // If the only difference between the current URL and the clicked URL is the hash
  // then force a window.location update so that Backbone.Router can take care of it
  if (!appFrame) {
    if (
      location.scheme === target.scheme &&
      location.host === target.host &&
      location.pathname === target.pathname &&
      location.search === target.search
    ) {
      debug(`routeLink hash change -> window.location=${target.href}`);
      window.location = target.href;
      return true;
    }
  }

  // internal links to valid rooms shouldn't open in new windows
  // Except if they have a target
  if (internalLink && isValidRoomUri(target.pathname)) {
    var uri = target.pathname.substring(1);
    var type = 'chat';
    if (uri === context.user().get('username')) {
      type = 'home';
    }
    const newUrl = target.pathname + target.search;
    debug(`routeLink internal link navigation=${newUrl}`);
    appEvents.trigger('navigation', newUrl, type, uri);
    return true;
  }
}

function installLinkHandler() {
  $(document).on('click', 'a', function(e) {
    var target = e.currentTarget;

    var disableRouting = dataset.get(target, 'disableRouting');
    if (disableRouting) return; // Propegate the event....

    if (routeLink(target)) {
      e.preventDefault();
    }
  });
}

module.exports = {
  installLinkHandler: installLinkHandler,
  routeLink: routeLink
};
