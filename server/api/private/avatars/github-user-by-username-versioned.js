'use strict';

module.exports = function(username, version, size) {
  return {
    url: 'https://avatars.githubusercontent.com/' + username + '?v=' + version + '&s=' + size,
    longTermCachable: true
  };
};
