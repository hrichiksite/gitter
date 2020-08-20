'use strict';

var url = require('url');

function normalizeRedirect(roomUrl, req) {
  var pathname = url.parse(roomUrl).pathname;

  // Do we need to add the subframe on too?
  var m = req.path.match(/\/~\w+$/);
  var frame = (m && m[0]) || '';
  if (frame) {
    pathname = pathname + frame;
  }
  pathname = encodeURI(pathname);

  return url.format({ pathname: pathname, query: req.query });
}

module.exports = normalizeRedirect;
