'use strict';

var roomContextService = require('gitter-web-rooms/lib/room-context-service');
var debug = require('debug')('gitter:app:group-context-resolver-middleware');

function groupContextResolverMiddleware(req, res, next) {
  var uri = req.params.groupUri;
  debug('Looking up normalised uri %s', uri);

  return roomContextService
    .findContextForGroup(req.user, uri)
    .then(function(uriContext) {
      req.group = uriContext.group;
      req.uriContext = uriContext;
    })
    .asCallback(next);
}

module.exports = groupContextResolverMiddleware;
