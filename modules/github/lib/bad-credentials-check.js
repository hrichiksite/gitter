'use strict';

var env = require('gitter-web-env');
var logger = env.logger.get('github');

module.exports = exports = function badCredentialsCheck(err) {
  if (err.statusCode === 401 || err.statusCode === 403) {
    var logout = true;

    logger.info('Tentacles ' + err.statusCode + ' error.', {
      exception: err,
      headersIncluded: !!err.headers
    });

    if (err.headers) {
      var rateLimitRemaining = err.headers['x-ratelimit-remaining'];
      if (rateLimitRemaining) rateLimitRemaining = parseInt(rateLimitRemaining, 10);

      /* Run out of rate-limit? Don't log the user out */
      if (rateLimitRemaining === 0) {
        logout = false;
      }
    }

    if (logout) {
      err.gitterAction = 'logout_destroy_user_tokens';
    } else {
      // TODO: Notify the user somehow
    }
  }

  throw err;
};
