'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

module.exports = {
  install: function(mongooseConnection) {
    var IdentitySchema = new Schema({
      userId: { type: ObjectId, required: true },
      provider: { type: String, required: true },
      providerKey: { type: String },
      username: { type: String },
      displayName: { type: String },
      email: { type: String },
      accessToken: { type: String },
      // example: google oauth2
      refreshToken: { type: String },
      // example: twitter oauth1
      accessTokenSecret: { type: String },
      avatar: { type: String }
    });

    IdentitySchema.schemaTypeName = 'IdentitySchema';

    IdentitySchema.index({ userId: 1, provider: 1 }, { unique: true });
    IdentitySchema.index({ provider: 1, providerKey: 1 }, { unique: true });
    IdentitySchema.index({ userId: 1 });
    IdentitySchema.index({ email: 1 });

    IdentitySchema.extraIndices = [
      {
        keys: {
          provider: 1,
          username: 1
        },
        options: {
          background: true,
          unique: true,
          partialFilterExpression: {
            username: { $exists: true }
          }
        }
      }
    ];

    var Identity = mongooseConnection.model('Identity', IdentitySchema);

    // Do we want to create a unique index based off email?
    // IdentitySchema.index({ provider: 1, email: 1 }, { unique: true });

    return {
      model: Identity,
      schema: IdentitySchema
    };
  }
};
