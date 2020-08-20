'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var OAuthAccessTokenSchema = new Schema({
  token: { type: String, index: true, unique: true },
  userId: ObjectId,
  clientId: ObjectId,
  expires: Date
});

OAuthAccessTokenSchema.index({ userId: 1, clientId: 1 }, { sparse: true }); // can't be unique due to mongo fail
OAuthAccessTokenSchema.index({ clientId: 1 });
OAuthAccessTokenSchema.schemaTypeName = 'OAuthAccessTokenSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('OAuthAccessToken', OAuthAccessTokenSchema);

    return {
      model: model,
      schema: OAuthAccessTokenSchema
    };
  }
};
