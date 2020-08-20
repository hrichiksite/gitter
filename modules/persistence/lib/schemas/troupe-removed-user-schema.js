'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

module.exports = {
  install: function(mongooseConnection) {
    //
    // User removed from a Troupe
    //
    var TroupeRemovedUserSchema = new Schema({
      troupeId: { type: ObjectId },
      userId: { type: ObjectId },
      date: { type: Date },
      flags: { type: Number }
    });
    TroupeRemovedUserSchema.schemaTypeName = 'TroupeRemovedUserSchema';

    TroupeRemovedUserSchema.index({ troupeId: 1 });
    TroupeRemovedUserSchema.index({ userId: 1 });

    var TroupeRemovedUser = mongooseConnection.model('TroupeRemovedUser', TroupeRemovedUserSchema);

    return {
      model: TroupeRemovedUser,
      schema: TroupeRemovedUserSchema
    };
  }
};
