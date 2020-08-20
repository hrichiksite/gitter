'use strict';

const env = require('gitter-web-env');
const logger = env.logger;

var Tentacles = require('tentacles');
var request = require('./request-wrapper');
var badCredentialsCheck = require('./bad-credentials-check');

const extensions = [];
if (process.env.DISABLE_GITHUB_API) {
  logger.warn(
    'GitHub API access via tentacles is being stubbed! (environment variable DISABLE_GITHUB_API detected)'
  );

  extensions.push(function(options, callback /*, next*/) {
    // Bypass the underlying call and return immediately with a static mocked response
    return callback(
      null,
      { statusCode: 200, headers: { 'content-type': 'application/json' } },
      '[]'
    );
  });
}

var tentacles = new Tentacles({
  request: request,
  errorHandler: badCredentialsCheck,
  extensions
});

module.exports = tentacles;
