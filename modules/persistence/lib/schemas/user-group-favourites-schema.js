'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var UserGroupFavouritesSchema = new Schema({
  userId: { type: ObjectId },
  favs: Schema.Types.Mixed
});
UserGroupFavouritesSchema.index({ userId: 1 }, { unique: true }); // Should be unique no?
UserGroupFavouritesSchema.schemaTypeName = 'UserGroupFavourites';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('UserGroupFavourites', UserGroupFavouritesSchema);

    return {
      model: model,
      schema: UserGroupFavouritesSchema
    };
  }
};
