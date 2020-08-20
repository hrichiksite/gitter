'use strict';

class PushNotificationDeviceStrategy {
  contstructor(options) {
    this.userId = options.userId || options.currentUserId;
  }

  preload() {}

  map(item) {
    return {
      id: item.id || item._id,
      userId: item.userId,
      deviceId: item.deviceId,
      deviceName: item.deviceName,
      deviceType: item.deviceType,
      mobileNumber: item.mobileNumber,
      enabled: item.enabled,
      appVersion: item.appVersion,
      appBuild: item.appBuild,
      timestamp: item.timestamp
    };
  }
}

module.exports = PushNotificationDeviceStrategy;
