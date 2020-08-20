'use strict';

const Promise = require('bluebird');
const UserIdStrategy = require('./user-id-strategy');
const ChatIdStrategy = require('./chat-id-strategy');

function ChatMessageReportStrategy(options) {
  const userIdStategy = new UserIdStrategy(options);
  const chatIdStategy = new ChatIdStrategy(options);

  this.preload = function(chatMessageReports) {
    // We can't use a `Array.reduce` because there is some magic `Sequence` methods expected that would get stripped :shrug:
    const reporterUserIds = chatMessageReports.map(report => report.reporterUserId);
    const messageUserIds = chatMessageReports.map(report => report.messageUserId);

    const chatIds = chatMessageReports.map(report => report.messageId);

    return Promise.all([
      userIdStategy.preload(reporterUserIds.concat(messageUserIds)),
      chatIdStategy.preload(chatIds)
    ]);
  };

  this.map = function(report) {
    const reporterUser = userIdStategy.map(report.reporterUserId);
    const messageUser = userIdStategy.map(report.messageUserId);

    const message = chatIdStategy.map(report.messageId);

    return {
      id: report._id,
      sent: report.sent,
      weight: report.weight,
      // Included because the `messageUser` may have been deleted
      reporterUserId: report.reporterUserId,
      reporterUser: reporterUser,
      messageId: report.messageId,
      // Included because the `messageUser` may have been deleted
      messageUserId: report.messageUserId,
      messageUser: messageUser,
      // messageText contains the text when the report was made
      // which may differ from the current message
      messageText: report.text,
      message
    };
  };
}
ChatMessageReportStrategy.prototype = {
  name: 'ChatMessageReportStrategy'
};

module.exports = ChatMessageReportStrategy;
