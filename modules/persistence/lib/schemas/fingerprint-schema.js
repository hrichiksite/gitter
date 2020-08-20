'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;

var FingerprintSchema = new Schema(
  {
    userId: { type: String, required: true },
    fingerprints: [
      {
        fingerprint: { type: String, required: true },
        ipAddress: { type: String, required: false }
      }
    ]
  },
  { strict: 'throw' }
);

FingerprintSchema.schemaTypeName = 'FingerprintSchema';
FingerprintSchema.index({ userId: 1 }, { unique: true, background: true });
FingerprintSchema.index({ 'fingerprints.fingerprint': 1 }, { background: true });
FingerprintSchema.index({ 'fingerprints.ipAddress': 1 }, { background: true });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Fingerprint', FingerprintSchema);

    return {
      model: Model,
      schema: FingerprintSchema
    };
  }
};
