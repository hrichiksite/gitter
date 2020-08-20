'use strict';

const mongoose = require('gitter-web-mongoose-bluebird');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const ChatMessageReportSchema = new Schema({
  sent: { type: Date },
  weight: Number,
  reporterUserId: { type: ObjectId, required: true },
  messageId: { type: ObjectId, required: true },
  messageUserId: { type: ObjectId, required: true },
  text: String
});
ChatMessageReportSchema.index({ reporterUserId: 1, sent: -1 });
ChatMessageReportSchema.index({ messageUserId: 1, sent: -1 });
ChatMessageReportSchema.index({ messageId: 1, sent: -1 });
ChatMessageReportSchema.index({ reporterUserId: 1, messageId: 1 }, { unique: true });
ChatMessageReportSchema.schemaTypeName = 'ChatMessageReportSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('ChatMessageReport', ChatMessageReportSchema);

    return {
      model: model,
      schema: ChatMessageReportSchema
    };
  }
};
