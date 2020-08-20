'use strict';

var debug = require('debug')('gitter:api:invite-user-suggestions');
var collaboratorsService = require('gitter-web-collaborators');

function resolveInviteUserSuggestions(req, res, next) {
  // null, 'GH_REPO', 'GH_ORG'
  var type = req.query.type;
  var linkPath = req.query.linkPath;

  return collaboratorsService
    .findCollaborators(req.user, type, linkPath)
    .then(function(suggestions) {
      debug('suggestions', suggestions);
      res.send(suggestions);
    })
    .catch(function(err) {
      debug('err', err, err.stack);
      throw err;
    })
    .catch(next);
}

module.exports = resolveInviteUserSuggestions;
