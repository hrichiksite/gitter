'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

//
// Settings for a user for a troupe
//
var UserSettingsSchema = new Schema({
  userId: ObjectId,
  settings: Schema.Types.Mixed
});
UserSettingsSchema.index({ userId: 1 }, { unique: true });
UserSettingsSchema.schemaTypeName = 'UserSettingsSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('UserSettings', UserSettingsSchema);

    return {
      model: model,
      schema: UserSettingsSchema
    };
  }
};
