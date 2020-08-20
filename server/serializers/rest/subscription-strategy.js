'use strict';

class SubscriptionStrategy {
  contstructor(options) {
    this.userId = options.userId || options.currentUserId;
  }

  preload() {}

  map(item) {
    return {
      id: item.id || item._id,
      userId: item.userId,
      uri: item.uri,
      lcUri: item.lcUri,
      plan: item.plan,
      subscriptionType: item.subscriptionType,
      status: item.status
    };
  }
}

module.exports = SubscriptionStrategy;
