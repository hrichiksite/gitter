'use strict';

var normalizeRedirect = require('./normalise-redirect');
var StatusError = require('statuserror');

/**
 * Handles various 404 and 301 error codes and deals with the
 * in a reasonable manner
 */
function redirectErrorMiddleware(err, req, res, next) {
  switch (err.status) {
    case 301:
      // TODO: check this works for userhome....
      if (err.path) {
        res.redirect(normalizeRedirect(err.path, req));
        // Terminate processing
        return;
      }

      return next(new StatusError(500, 'Invalid redirect'));

    case 404:
      if (err.githubType === 'ORG' && err.uri) {
        var url = '/orgs/' + err.uri + '/rooms';
        //test if we are trying to load the org page in the chat frame.
        //fixes: https://github.com/troupe/gitter-webapp/issues/628
        if (/~chat$/.test(req.route.path)) {
          url = url += '/~iframe';
        }
        res.redirect(url);

        // Terminate processing
        return;
      }
  }

  return next(err);
}

module.exports = redirectErrorMiddleware;
