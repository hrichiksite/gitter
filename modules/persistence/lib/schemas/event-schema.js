'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var installVersionIncMiddleware = require('../install-version-inc-middleware');

//
// A single event
//
var EventSchema = new Schema({
  fromUserId: ObjectId,
  toTroupeId: ObjectId, //TODO: rename to troupeId
  text: String,
  html: String,
  meta: Schema.Types.Mixed,
  payload: Schema.Types.Mixed,
  sent: { type: Date, default: Date.now },
  editedAt: { type: Date, default: null },
  _tv: { type: 'MongooseNumber', default: 0 },
  _md: Number // Meta parse version
});
EventSchema.index({ toTroupeId: 1, sent: -1 });
EventSchema.schemaTypeName = 'EventSchema';

installVersionIncMiddleware(EventSchema);

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('Event', EventSchema);

    return {
      model: model,
      schema: EventSchema
    };
  }
};
