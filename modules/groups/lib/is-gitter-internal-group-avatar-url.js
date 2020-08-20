'use strict';

const env = require('gitter-web-env');
const config = env.config;
const url = require('url');

const GITTER_AVATAR_UPLOAD_HOST = `${config.get('transloadit:avatars:bucket')}.s3.amazonaws.com`;

function isGitterInternalAvatarUrl(avatarUrl) {
  const parsed = url.parse(avatarUrl);

  return parsed.host === GITTER_AVATAR_UPLOAD_HOST;
}

module.exports = isGitterInternalAvatarUrl;
