'use strict';

var gravatar = require('gitter-web-avatars/server/gravatar');

module.exports = function(md5, size) {
  return {
    url: gravatar.forChecksum(md5, size),
    longTermCachable: true
  };
};
