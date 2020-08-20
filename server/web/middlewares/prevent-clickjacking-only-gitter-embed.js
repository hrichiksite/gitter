'use strict';

const env = require('gitter-web-env');
const config = env.config;

// Only allow iframe embedding from within Gitter
function preventClickjackingOnlyGitterEmbedMiddleware(req, res, next) {
  // `sameorigin` does not work here because the desktop app has a root origin of `chrome-extension://` and will be blocked
  res.set('X-Frame-Options', `allow-from ${config.get('web:basepath')}`);
  // Because Chrome does not support `X-Frame-Options: allow-from <uri>` syntax above, we also have a CSP setup
  res.set('Content-Security-Policy', `frame-ancestors 'self' ${config.get('web:basepath')}`);

  next();
}

module.exports = preventClickjackingOnlyGitterEmbedMiddleware;
