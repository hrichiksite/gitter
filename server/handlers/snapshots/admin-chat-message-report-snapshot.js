'use strict';

const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
const restSerializer = require('../../serializers/rest-serializer');
const chatReportService = require('gitter-web-chat-reports');

function postprocessUser(user) {
  if (user) {
    return Object.assign({}, user, {
      accountCreatedDate: mongoUtils.getTimestampFromObjectId(user.id)
    });
  }
}

function getSnapshotsForPageContext(req) {
  return chatReportService
    .findChatMessageReports({
      beforeId: req.query.beforeId,
      afterId: req.query.afterId,
      limit: req.query.limit
    })
    .then(function(reports) {
      const strategy = new restSerializer.ChatMessageReportStrategy();
      return restSerializer.serialize(reports, strategy);
    })
    .then(serializedReports => {
      return {
        adminChatMessageReportDashboard: {
          reports: serializedReports.map(report => {
            return Object.assign({}, report, {
              reporterUser: postprocessUser(report.reporterUser),
              messageUser: postprocessUser(report.messageUser)
            });
          })
        }
      };
    });
}

module.exports = getSnapshotsForPageContext;
