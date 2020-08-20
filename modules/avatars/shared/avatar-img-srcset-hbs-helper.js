'use strict';

var urlParse = require('url-parse');
var avatars = require('..');

function avatarImgSrcSetHbsHelper(avatarServerUrl, size) {
  if (!avatarServerUrl) {
    return " height='" + size + "' width='" + size + "' src='" + avatars.getDefault() + "'";
  }

  var parsedAvatarServerUrl = urlParse(avatarServerUrl, true);
  parsedAvatarServerUrl.query.s = size;

  var parsedAvatarServerUrlSrcSet = urlParse(avatarServerUrl, true);
  parsedAvatarServerUrlSrcSet.query.s = 2 * size;

  var src = parsedAvatarServerUrl.toString();
  var srcset = parsedAvatarServerUrlSrcSet.toString() + ' 2x';

  return " height='" + size + "' width='" + size + "' src='" + src + "' srcset='" + srcset + "' ";
}

module.exports = avatarImgSrcSetHbsHelper;
