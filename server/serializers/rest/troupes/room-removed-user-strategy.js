'use strict';

class RoomRemovedUserStrategy {
  contstructor(options) {
    this.userId = options.userId || options.currentUserId;
  }

  preload() {}

  map(item) {
    return {
      id: item.id || item._id,
      troupeId: item.troupeId,
      userId: item.userId,
      date: item.date,
      flags: item.flags
    };
  }
}

module.exports = RoomRemovedUserStrategy;
