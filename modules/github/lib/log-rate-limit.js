'use strict';

var env = require('gitter-web-env');
var logger = env.logger.get('github');
var stats = env.stats;

module.exports = function(options, callback, request) {
  request(options, function(error, response, body) {
    if (response && response.headers) {
      var remaining = response.headers['x-ratelimit-remaining'];

      if (remaining) {
        remaining = parseInt(remaining, 10);
        if (!isNaN(remaining)) {
          if (remaining === 0) {
            stats.event('github.ratelimit.exceeded');
          }

          if (remaining < 300) {
            logger.warn('Rate limit is down to ' + remaining, {
              options: options,
              reset: response.headers['x-ratelimit-reset'],
              limit: response.headers['x-ratelimit-limit']
            });
          }
        }
      }
    }

    return callback(error, response, body);
  });
};
