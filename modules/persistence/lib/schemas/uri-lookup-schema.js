'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var UriLookupSchema = new Schema({
  uri: { type: String, unique: true },
  userId: { type: ObjectId, unique: true, sparse: true },
  troupeId: { type: ObjectId, unique: true, sparse: true },
  groupId: { type: ObjectId, unique: true, sparse: true }
});
UriLookupSchema.schemaTypeName = 'UriLookupSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('UriLookup', UriLookupSchema);

    return {
      model: model,
      schema: UriLookupSchema
    };
  }
};
