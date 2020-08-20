'use strict';

var _ = require('lodash');
var Backbone = require('backbone');
const debug = require('debug-proxy')('app:spa-room-switcher');
var urlParser = require('../utils/url-parser');
const log = require('../utils/log');

function SpaRoomSwitcher(troupesCollection, baseUrl, locationDelegate, windowLocationDelegate) {
  this._troupes = troupesCollection;
  this._baseUrl = baseUrl;
  this._locationDelegate = locationDelegate;
  this._windowLocationDelegate =
    windowLocationDelegate ||
    function() {
      return window.location;
    }; // Makes testing in node easier.
  this._isLoadingIFrame = false;
}

_.extend(SpaRoomSwitcher.prototype, Backbone.Events, {
  change: function(iframeUrl) {
    try {
      this._change(iframeUrl);
    } catch (err) {
      log.error('Problem in SpaRoomSwitcher change', { exception: err });
    }
  },

  _change: function(iframeUrl) {
    const targetParsed = urlParser.parse(iframeUrl);

    let pathname = targetParsed.pathname;
    // Fix for IE 10 giving iframeUrls with first slash missing
    if (iframeUrl.search(/^https?:/i) < 0 && iframeUrl.charAt(0) !== '/') {
      pathname = '/' + pathname;
    }

    // Check that we are navigating to a ~chat page
    var targetInfo = this.getFrameType(pathname);
    if (targetInfo.type === 'chat' && targetInfo.roomUrl) {
      // Try find the room in the collection
      var newTroupe = this._troupes.findWhere({ url: targetInfo.roomUrl });
      if (newTroupe) {
        // TODO this line seems to be the only remaining functionality of room switcher
        // we could remove the whole class and just replace  the on('switch') listener in router-app
        // with valid code from this method
        debug('found room in collection, switching to room:', newTroupe);
        return this.trigger('switch', newTroupe);
      }
    }

    // Else fallback to just redirecting
    debug('unable to find room in collection, redirecting to url:', targetInfo.roomUrl);
    window.location.assign(targetInfo.roomUrl);
  },

  getFrameType: function(locationHref) {
    var match = locationHref.match(/(\/.*?)(\/~(\w+))?$/);
    if (!match) return {};

    return {
      roomUrl: match[1],
      type: match[3]
    };
  },

  setIFrameLoadingState: function(state) {
    this._isLoadingIFrame = state;
  }
});

module.exports = SpaRoomSwitcher;
