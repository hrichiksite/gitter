'use strict';

const env = require('gitter-web-env');
const logger = env.logger;

// eslint-disable-next-line complexity
function getAccessToken(req) {
  if (req.headers && req.headers['authorization']) {
    var authHeader = req.headers['authorization'];

    /* Temporary fix - remove 15 May 2014 */
    /* A bug in the OSX client adds this header each time a refresh is done */
    if (authHeader.indexOf('Bearer ') === 0 && authHeader.indexOf(',') >= 0) {
      logger.warn('auth: compensating for incorrect auth header');
      authHeader = authHeader.split(/,/)[0];
    }

    var parts = authHeader.split(' ');

    if (parts.length === 2) {
      var scheme = parts[0];

      if (/Bearer/i.test(scheme)) {
        return parts[1];
      }
    }
  }

  if (req.headers && req.headers['x-access-token']) {
    return req.headers['x-access-token'];
  }

  if (req.body && req.body['access_token']) {
    return req.body['access_token'];
  }

  if (req.query && req.query['access_token']) {
    return req.query['access_token'];
  }

  // FIXME Hack for the node-webkit app, we *have* to send the token in the user-agent header.
  // If in the future node-webkit adds support for custom headers we can remove this.
  if (req.headers && req.headers['user-agent']) {
    var ua_token = req.headers['user-agent'].match(/Token\/(\w+)/);
    if (ua_token) return ua_token[1];
  }
}

module.exports = getAccessToken;
