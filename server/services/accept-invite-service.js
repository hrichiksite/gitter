'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;

var RoomWithPolicyService = require('gitter-web-rooms/lib/room-with-policy-service');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var invitesService = require('gitter-web-invites/lib/invites-service');
var StatusError = require('statuserror');
var assert = require('assert');
var Promise = require('bluebird');
var addInvitePolicyFactory = require('gitter-web-permissions/lib/add-invite-policy-factory');

/**
 * Accepts an invitation and return the room the user has just joined
 */
function acceptInvite(user, secret, options) {
  assert(user);

  return invitesService
    .accept(user._id, secret)
    .bind({
      invite: null,
      room: null
    })
    .then(function(invite) {
      if (!invite) throw new StatusError(404);
      this.invite = invite;
      var troupeId = invite.troupeId;
      return troupeService.findById(troupeId);
    })
    .then(function(room) {
      if (!room) throw new StatusError(404);
      this.room = room;

      return addInvitePolicyFactory.createPolicyForRoomInvite(user, room, secret);
    })
    .then(function(policy) {
      var roomWithPolicyService = new RoomWithPolicyService(this.room, user, policy);
      var joinRoomOptions = {
        source: options && options.source
      };
      return roomWithPolicyService.joinRoom(joinRoomOptions);
    })
    .then(function() {
      return invitesService.markInviteAccepted(this.invite._id, user._id).return(this.room);
    })
    .tap(function() {
      // Success statistics
      var room = this.room;
      var invite = this.invite;
      stats.event('invite_accepted', {
        source: options && options.source,
        userId: user && (user.id || user._id),
        troupeId: room && (room.id || room._id),
        type: invite.type,
        uri: room && room.uri
      });
    })
    .catch(StatusError, function(err) {
      if (err.status >= 500) throw err;

      logger.error('Invitation accept failed', { exception: err });

      if (this.invite) {
        return invitesService.markInviteRejected(this.invite._id, user._id).throw(err);
      }

      throw err;
    })
    .catch(function(e) {
      // Failure statistics
      var room = this.room;
      var invite = this.invite;

      stats.event('invite_rejected', {
        userId: user && (user.id || user._id),
        troupeId: room && (room.id || room._id),
        type: invite && invite.type,
        uri: room && room.uri
      });

      throw e;
    });
}

module.exports = {
  acceptInvite: Promise.method(acceptInvite)
};
