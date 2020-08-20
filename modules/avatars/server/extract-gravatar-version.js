'use strict';

var url = require('url');

var GITHUB_AVATARS_HOST_RE = /^avatars\d*\.githubusercontent\.com$/;

/* Given a avatar url, get the cache buster */
module.exports = function extractGravatarVersion(avatarUrl) {
  try {
    var parsed = url.parse(avatarUrl, true, true);

    if (GITHUB_AVATARS_HOST_RE.test(parsed.hostname)) {
      return parseInt(parsed.query.v, 10) || undefined;
    }
  } catch (e) {
    /* */
  }
};
