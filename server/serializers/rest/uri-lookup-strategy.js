'use strict';

class UriLookupStrategy {
  contstructor(options) {
    this.userId = options.userId || options.currentUserId;
  }

  preload() {}

  map(item) {
    return {
      id: item.id || item._id,
      uri: item.uri,
      userId: item.userId,
      troupeId: item.troupeId,
      groupId: item.groupId
    };
  }
}

module.exports = UriLookupStrategy;
