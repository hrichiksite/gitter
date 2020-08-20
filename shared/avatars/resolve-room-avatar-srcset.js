'use strict';

var resolveUserAvatarSrcSet = require('./resolve-user-avatar-srcset');

module.exports = function resolveRoomAvatarSrcSet(room, size) {
  //In the case where we explicit pass null we just return it.
  //useful for recent searches in the new left menu
  if (room.uri === null) {
    return null;
  }

  // this is only supporting room.uri for now. Not sure if room.user or
  // room.owner or something would make more sense in future?
  size = size || 48;

  if (room && room.uri) {
    var leadingSlash = room.uri[0] === '/';
    var base = room.uri.split('/')[leadingSlash ? 1 : 0];
    if (base) {
      // treat the first path component as a username just like before
      return resolveUserAvatarSrcSet({ username: base }, size);
    }
  }

  // default: just return resolveUserAvatarSrcSet's default
  return resolveUserAvatarSrcSet({}, size);
};
