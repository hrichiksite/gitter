'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var UserTroupeLastAccessSchema = new Schema({
  userId: ObjectId,
  troupes: Schema.Types.Mixed, // Used for hiding the recent troupes list
  last: Schema.Types.Mixed, // The real date of the last time they opened the room
  added: Schema.Types.Mixed // If the user was added to the room, the date this happened
});
UserTroupeLastAccessSchema.index({ userId: 1 }); // Should be unique no?
UserTroupeLastAccessSchema.schemaTypeName = 'UserTroupeLastAccessSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('UserTroupeLastAccess', UserTroupeLastAccessSchema);

    return {
      model: model,
      schema: UserTroupeLastAccessSchema
    };
  }
};
