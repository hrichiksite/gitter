'use strict';

class UserSettingsStrategy {
  preload() {}

  map(item) {
    return {
      id: item.id || item._id,
      userId: item.userId,
      settings: item.settings
    };
  }
}

module.exports = UserSettingsStrategy;
