'use strict';

var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var ChatMessage = require('./chat-message-schema');

var ChatMessageBackupSchema = mongooseUtils.cloneSchema(ChatMessage.ChatMessageSchema);

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('ChatMessageBackup', ChatMessageBackupSchema);

    return {
      model: model,
      schema: ChatMessageBackupSchema
    };
  }
};
