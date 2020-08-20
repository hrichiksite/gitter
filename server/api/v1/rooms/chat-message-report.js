'use strict';

const restSerializer = require('../../../serializers/rest-serializer');
const chatReportService = require('gitter-web-chat-reports');

module.exports = {
  id: 'report',

  create: function(req) {
    return chatReportService.newReport(req.user, req.params.chatMessageId).then(function(report) {
      const strategy = new restSerializer.ChatMessageReportStrategy();
      return restSerializer.serializeObject(report, strategy);
    });
  }
};
