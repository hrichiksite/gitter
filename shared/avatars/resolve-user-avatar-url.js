'use strict';

var resolveUserAvatarSrcSet = require('./resolve-user-avatar-srcset');

module.exports = function resolveUserAvatarUrl(user, size) {
  var srcset = resolveUserAvatarSrcSet(user, size);
  return srcset.src;
};
