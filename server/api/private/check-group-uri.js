'use strict';

var groupUriChecker = require('gitter-web-groups/lib/group-uri-checker');

function checkGroupUri(req, res, next) {
  return groupUriChecker(req.user, req.query.uri)
    .then(function(info) {
      if (info.allowCreate) {
        res.send({
          type: info.type
        });
        // This is clearly a GitHub permsisions issue (#github-uri-split)
      } else if (
        !info.localUriExists &&
        (info.type === 'GH_ORG' || info.type === 'GH_REPO' || info.type === 'GH_USER')
      ) {
        res.sendStatus(403);
      } else {
        res.sendStatus(409);
      }
    })
    .catch(next);
}

module.exports = checkGroupUri;
