'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

module.exports = {
  install: function(mongooseConnection) {
    //
    // User in a Troupe
    //
    var TroupeUserSchema = new Schema({
      troupeId: { type: ObjectId },
      userId: { type: ObjectId },
      flags: { type: Number }
    });
    TroupeUserSchema.schemaTypeName = 'TroupeUserSchema';

    TroupeUserSchema.index({ troupeId: 1, userId: 1 }, { unique: true });
    TroupeUserSchema.index({ troupeId: 1 });
    TroupeUserSchema.index({ userId: 1 });

    var TroupeUser = mongooseConnection.model('TroupeUser', TroupeUserSchema);

    return {
      model: TroupeUser,
      schema: TroupeUserSchema
    };
  }
};
