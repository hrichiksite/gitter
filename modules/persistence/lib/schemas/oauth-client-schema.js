'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

/*
 * OAuth Stuff
 */
var OAuthClientSchema = new Schema({
  name: String,
  tag: String,
  clientKey: String,
  clientSecret: String,
  registeredRedirectUri: String,
  canSkipAuthorization: Boolean,
  ownerUserId: ObjectId,
  revoked: Boolean
});
OAuthClientSchema.index({ clientKey: 1 });
OAuthClientSchema.index({ ownerUserId: 1 });
OAuthClientSchema.schemaTypeName = 'OAuthClientSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('OAuthClient', OAuthClientSchema);

    return {
      model: model,
      schema: OAuthClientSchema
    };
  }
};
