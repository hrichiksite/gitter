'use strict';

var troupeService = require('gitter-web-rooms/lib/troupe-service');
var StatusError = require('statuserror');

module.exports = function(req) {
  return troupeService.findById(req.params.troupeId).then(function(troupe) {
    if (!troupe) throw new StatusError(404);
    return troupe;
  });
};
