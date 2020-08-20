'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var PushNotificationDeviceSchema = new Schema({
  userId: ObjectId,
  deviceId: String,
  deviceName: String,
  /*
   * appleToken should be a raw Buffer, but mongoose throws a CastError when doing an update.
   * We instead store the hex string, which is what apn's pushNotification uses anyway.
   */
  appleToken: String,
  androidToken: String,
  tokenHash: String,
  deviceType: { type: String, enum: ['APPLE', 'APPLE-DEV', 'ANDROID', 'TEST', 'SMS', 'VAPID'] },
  mobileNumber: { type: String },
  vapid: {
    auth: { type: String },
    p256dh: { type: String }
  },
  enabled: { type: Boolean, default: true },
  appVersion: String,
  appBuild: String,
  timestamp: Date
});
PushNotificationDeviceSchema.index({ deviceId: 1 });
PushNotificationDeviceSchema.index({ userId: 1 });
PushNotificationDeviceSchema.index({ tokenHash: 1 });
PushNotificationDeviceSchema.index({ mobileNumber: 1 });

PushNotificationDeviceSchema.schemaTypeName = 'PushNotificationDeviceSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('PushNotificationDevice', PushNotificationDeviceSchema);

    return {
      model: model,
      schema: PushNotificationDeviceSchema
    };
  }
};
