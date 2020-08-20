'use strict';

var resolveUserAvatarSrcSet = require('gitter-web-shared/avatars/resolve-user-avatar-srcset');

module.exports = exports = function(template) {
  return function avatarWidgetHandler(params) {
    var hash = params.hash;
    var user = hash.model || hash.user || {};

    var avatarSize = hash.avatarSize || 's';
    var showStatus = hash.showStatus;
    var imgSize = avatarSize == 'm' ? 64 : 30;
    var avatarSrcSet = resolveUserAvatarSrcSet(user, imgSize);

    var r = template({
      avatarSrcSet: avatarSrcSet,
      avatarSize: avatarSize,
      imgSize: imgSize,
      id: user.id,
      role: user.role,
      showStatus: showStatus,
      presenceClass: user.online ? 'online' : 'offline',
      inactive: user.removed
    });

    return r;
  };
};
