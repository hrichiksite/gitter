'use strict';

var loadTroupeFromParam = require('./load-troupe-param');
var collaboratorsService = require('gitter-web-collaborators');

module.exports = {
  id: 'resourceTroupeUser',

  index: function(req) {
    return loadTroupeFromParam(req).then(function(troupe) {
      return collaboratorsService.findCollaborators(req.user, troupe.sd.type, troupe.sd.linkPath);
    });
  }
};
