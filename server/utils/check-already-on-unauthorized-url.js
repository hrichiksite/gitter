'use strict';

var escapeStringRegexp = require('escape-string-regexp');
var unauthorizedRedirectMap = require('./unauthorized-redirect-map');

var unauthorizedUrlRedirectRegexList = Object.keys(unauthorizedRedirectMap).map(redirectKey => {
  const redirectUrl = unauthorizedRedirectMap[redirectKey];
  return new RegExp(`${escapeStringRegexp(redirectUrl)}(\\/(\\?.*)?)?$`);
});

function checkAlreadyOnUnauthorizedUrl(url) {
  // Avoid a redirect loop even when someone is forcing a token via
  // `?access_token=xxxtoken` query parameter or `Authorization: bearer xxxtoken` header
  return unauthorizedUrlRedirectRegexList.some(unauthorizedRe => {
    return url.match(unauthorizedRe);
  });
}

module.exports = checkAlreadyOnUnauthorizedUrl;
