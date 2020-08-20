'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var securityDescriptor = require('./security-descriptor-subdocument');

var GroupSchema = new Schema(
  {
    name: { type: String, required: true },
    uri: { type: String, required: true },
    lcUri: { type: String, required: true },
    sd: { type: securityDescriptor.Schema, required: false },
    avatarUrl: { type: String, required: false },
    avatarVersion: { type: Number, required: false, default: 0 },
    avatarCheckedDate: { type: Date, required: false },
    homeUri: { type: String },
    lcHomeUri: { type: String }
  },
  { strict: 'throw' }
);

GroupSchema.schemaTypeName = 'GroupSchema';
GroupSchema.index({ lcUri: 1 }, { unique: true });
GroupSchema.index({ lcHomeUri: 1 }, { unique: true, sparse: true });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Group', GroupSchema);

    return {
      model: Model,
      schema: GroupSchema
    };
  }
};
