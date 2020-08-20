'use strict';

class RoomInviteStrategy {
  contstructor(options) {
    this.userId = options.userId || options.currentUserId;
  }

  preload() {}

  map(invite) {
    return {
      id: invite.id || invite._id,
      troupeId: invite.troupeId,
      type: invite.type,
      emailAddress: invite.emailAddress,
      externalId: invite.externalId,
      userId: invite.userId,
      invitedByUserId: invite.invitedByUserId,
      state: invite.state,
      reminderSent: invite.reminderSent
    };
  }
}

module.exports = RoomInviteStrategy;
