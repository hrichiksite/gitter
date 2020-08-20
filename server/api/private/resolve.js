'use strict';

var roomContextService = require('gitter-web-rooms/lib/room-context-service');
var StatusError = require('statuserror');
var uriContextAsBrowserState = require('gitter-web-uri-resolver/lib/uri-context-as-browser-state');

/**
 * This API is currently a work in progress and shouldn't be
 * relied upon until it is ratified.
 */
function resolve(req, res, next) {
  var uri = req.params[0];

  return roomContextService
    .findContextForUri(req.user, uri, { ignoreCase: true })
    .bind({
      uriContext: null
    })
    .then(function(uriContext) {
      if (!uriContext) {
        throw new StatusError(404);
      }

      this.uriContext = uriContext;

      if (uriContext.ownUrl) {
        return true;
      }

      return uriContext.policy.canRead();
    })
    .then(function(access) {
      if (!access) throw new StatusError(404);

      var browserState = uriContextAsBrowserState(this.uriContext);
      if (!browserState) throw new StatusError(404);

      /*
       * TODO: consider adding Cache Control headers to this
       * API
       * `res.set('Cache-Control', 'max-age=3600');`
       */

      res.send(browserState);
    })
    .catch(next);
}

module.exports = resolve;
