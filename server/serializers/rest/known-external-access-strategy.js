'use strict';

class KnownExternalAccessStrategy {
  contstructor(options) {
    this.userId = options.userId || options.currentUserId;
  }

  preload() {}

  map(item) {
    return {
      id: item.id || item._id,
      userId: item.userId,
      type: item.type,
      policyName: item.policyName,
      linkPath: item.linkPath,
      externalId: item.externalId,
      accessTime: item.accessTime
    };
  }
}

module.exports = KnownExternalAccessStrategy;
