'use strict';

var TWITTER_AVATAR_PREFIX = 'https://pbs.twimg.com/profile_images/';

/*
Take a twitter profile image like:
https://pbs.twimg.com/profile_images/378800000308609669/c5cc5261cc55da2dbca442eaf60920cc_normal.jpeg

And return the significant parts:
{
  id: '378800000308609669',
  filename: 'c5cc5261cc55da2dbca442eaf60920cc_normal.jpeg'
}
*/
function extractTwitterAvatarInfo(twitterUrl) {
  if (twitterUrl.indexOf(TWITTER_AVATAR_PREFIX) !== 0) {
    // doesn't look like a twitter profile pic
    return null;
  }
  var rest = twitterUrl.slice(TWITTER_AVATAR_PREFIX.length);
  var id = rest.slice(0, rest.indexOf('/'));
  var filename = rest.slice(rest.indexOf('/') + 1);
  return {
    id: id,
    filename: filename
  };
}

module.exports = extractTwitterAvatarInfo;
