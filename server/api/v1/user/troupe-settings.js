'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var userDefaultFlagsService = require('gitter-web-rooms/lib/user-default-flags-service');
var userRoomModeUpdateService = require('gitter-web-rooms/lib/user-room-mode-update-service');

function generateResponse(userId, troupeId) {
  return Promise.join(
    roomMembershipService.getMembershipDetails(userId, troupeId),
    userDefaultFlagsService.getDefaultFlagDetailsForUserId(userId),
    function(details, defaults) {
      if (!details) throw new StatusError(404);

      return {
        push: details.mode, // REMOVE THIS
        mode: details.mode,
        lurk: details.lurk, // ALSO deprecated

        unread: details.unread,
        activity: details.activity,
        mention: details.mention,
        announcement: details.announcement,
        desktop: details.desktop,
        mobile: details.mobile,

        default: details.default,
        defaultSettings: defaults
      };
    }
  );
}
/**
 * TODO: REMOVE THIS WHOLE RESOURCE AND UPDATE THIS VIA THE USER TROUPE
 * with { mode: x }
 */
module.exports = {
  id: 'setting',

  show: function(req) {
    var userId = req.resourceUser.id;
    var troupeId = req.params.userTroupeId;
    var setting = req.params.setting;

    if (setting !== 'notifications') throw new StatusError(404);

    return generateResponse(userId, troupeId);
  },

  update: function(req) {
    var userId = req.resourceUser.id;
    var troupeId = req.params.userTroupeId;
    var setting = req.params.setting;

    if (setting !== 'notifications') throw new StatusError(404);

    var settings = req.body;
    var mode = settings && (settings.mode || settings.push);

    if (!mode) throw new StatusError(400, 'Illegal notifications mode');
    return userRoomModeUpdateService
      .setModeForUserInRoom(req.resourceUser, troupeId, mode)
      .then(function() {
        return generateResponse(userId, troupeId);
      });
  }
};
