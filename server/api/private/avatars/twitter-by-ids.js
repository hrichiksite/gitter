'use strict';

var TWITTER_AVATAR_PREFIX = 'https://pbs.twimg.com/profile_images/';

module.exports = function(id, filename) {
  return {
    url: TWITTER_AVATAR_PREFIX + id + '/' + filename
  };
};
