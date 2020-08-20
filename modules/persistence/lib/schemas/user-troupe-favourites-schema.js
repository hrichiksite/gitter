'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var UserTroupeFavouritesSchema = new Schema({
  userId: { type: ObjectId },
  favs: Schema.Types.Mixed
});
UserTroupeFavouritesSchema.index({ userId: 1 }, { unique: true }); // Should be unique no?
UserTroupeFavouritesSchema.schemaTypeName = 'UserTroupeFavourites';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('UserTroupeFavourites', UserTroupeFavouritesSchema);

    return {
      model: model,
      schema: UserTroupeFavouritesSchema
    };
  }
};
