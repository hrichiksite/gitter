'use strict';

var resolveRoomAvatarSrcSet = require('./resolve-room-avatar-srcset');

module.exports = function(room, size) {
  var srcset = resolveRoomAvatarSrcSet(room, size);
  return srcset.src;
};
