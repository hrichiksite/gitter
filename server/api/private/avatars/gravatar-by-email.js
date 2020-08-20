'use strict';

var gravatar = require('gitter-web-avatars/server/gravatar');

module.exports = function(email, size) {
  return {
    url: gravatar.forEmail(email, size),
    longTermCachable: true
  };
};
