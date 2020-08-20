'use strict';

module.exports = function hash(str) {
  if (!str || !str.length) return 1;

  /* djb2: http://www.cse.yorku.ca/~oz/hash.html */
  var f = 5381;
  for (var i = 0; i < str.length && i < 8; i++) {
    // Limit to the first 8 chars
    f = (f << 5) + f + str.charCodeAt(i); /* hash * 33 + c */
  }

  return (f > 0 ? f : -f) % 3; // defaults to 4 buckets;
};
