'use strict';

const StatusError = require('statuserror');

// For more context, see https://gitlab.com/gitlab-org/gitter/webapp/issues/2291#filtering-out-requests-with-transfer-encoding-chunked-and-content-length
module.exports = function(req, res, next) {
  if (req.headers['transfer-encoding'] === 'chunked') {
    return next(
      new StatusError(
        406,
        'Using the `Transfer-Encoding: chunked` header is not allowed when interacting with the API'
      )
    );
  }

  next();
};
