'use strict';

const Promise = require('bluebird');
const ChatMessageReport = require('gitter-web-persistence').ChatMessageReport;
const debug = require('debug')('gitter:tests:test-fixtures');

function createReport(fixtureName, f) {
  debug('Creating %s', fixtureName);

  return ChatMessageReport.create({
    sent: f.sent,
    weight: f.weight,
    reporterUserId: f.reporterUserId,
    messageId: f.messageId,
    messageUserId: f.messageUserId,
    text: f.text
  });
}

function createReports(expected, fixture) {
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^messageReport/)) {
      const expectedReport = expected[key];

      expectedReport.reporterUserId = fixture[expectedReport.user]._id;
      expectedReport.messageId = fixture[expectedReport.message]._id;
      expectedReport.messageUserId = fixture[expectedReport.message].fromUserId;
      expectedReport.text = fixture[expectedReport.message].text;

      return createReport(key, expectedReport).then(function(report) {
        fixture[key] = report;
      });
    }

    return null;
  });
}

module.exports = createReports;
