/* eslint-env browser */
'use strict';

// "?foo=bar&fish=chips" -> { foo: bar, fish: chips }
var parse = function(qs) {
  if (!qs || qs.length <= 1) return {};

  return qs
    .substring(1)
    .split('&')
    .reduce(function(memo, pair) {
      var splitPair = pair.split('=', 2).map(decodeURIComponent);

      memo[splitPair[0]] = splitPair[1];
      return memo;
    }, {});
};

let currentWindowSearch = '';
if (typeof window !== 'undefined') {
  currentWindowSearch = window.location.search;
}

module.exports = parse(currentWindowSearch);
