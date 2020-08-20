'use strict';

module.exports = function(username, size) {
  return {
    url: 'https://avatars.githubusercontent.com/' + username + '?s=' + size,
    longTermCachable: false
  };
};
