'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var TroupeMetaSchema = new Schema(
  {
    troupeId: { type: ObjectId, required: true },
    welcomeMessage: {
      html: String,
      text: String
    }
    // threadedConversations feature toggle is no longer used (since 2020-4-17)
    // threadedConversations: { type: Boolean, default: false }
  },
  { strict: true }
);

TroupeMetaSchema.index({ troupeId: 1 }, { unique: true });

TroupeMetaSchema.schemaTypeName = 'TroupeMetaSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('TroupeMeta', TroupeMetaSchema);
    return {
      model: model,
      schema: TroupeMetaSchema
    };
  }
};
