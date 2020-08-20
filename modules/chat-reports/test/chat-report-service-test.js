'use strict';

const assert = require('assert');
const sinon = require('sinon');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const proxyquireNoCallThru = require('proxyquire').noCallThru();
const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
const vanillaChatReportService = require('../');

const ONE_DAY_TIME = 24 * 60 * 60 * 1000; // One day

describe('chatReportService', function() {
  let chatReportService;
  let statsLog = [];
  let removeAllMessagesForUserIdSpy;
  let deleteMessageFromRoomSpy;
  let hellbanUserSpy;

  const fixture = fixtureLoader.setupEach({
    userBad1: {},
    user2: {},
    user3: {},
    user4: {},
    troupe1: {
      users: [
        'userBad1',
        'user2',
        'user3',
        'user4',
        'userMessageOverThreshold1',
        'userOverThreshold1',
        'userOldOverThreshold1'
      ]
    },

    message1: { user: 'userBad1', troupe: 'troupe1', text: 'new_message', sent: new Date() },
    message2: { user: 'userBad1', troupe: 'troupe1', text: 'new_message2', sent: new Date() },
    messageOld3: {
      user: 'userBad1',
      troupe: 'troupe1',
      text: 'old_message3',
      sent: new Date(Date.now() - 500 * ONE_DAY_TIME)
    },

    messageReport1: { user: 'user2', message: 'message1', sent: Date.now(), weight: 1 },
    // Ignored because report is too old
    messageReport2: {
      user: 'user4',
      message: 'message1',
      sent: new Date(Date.now() - 500 * ONE_DAY_TIME),
      weight: 7
    },
    // Ignored because report is too old
    messageReport3: {
      user: 'user2',
      message: 'message2',
      sent: new Date(Date.now() - 500 * ONE_DAY_TIME),
      weight: 7
    },
    // Ignored because there is another report from this user with higher weight below
    messageReport4: { user: 'user3', message: 'message1', sent: Date.now(), weight: 1 },
    messageReport5: { user: 'user3', message: 'message2', sent: Date.now(), weight: 2 },

    userMessageOverThreshold1: {},
    messageToReportOverThreshold1: {
      user: 'userMessageOverThreshold1',
      troupe: 'troupe1',
      text: 'over_threshold_message (message)',
      sent: new Date()
    },
    messageReportOverThreshold1: {
      user: 'user2',
      message: 'messageToReportOverThreshold1',
      sent: Date.now(),
      weight: vanillaChatReportService.BAD_MESSAGE_THRESHOLD
    },

    userOverThreshold1: {},
    messageToReportUserOverThreshold1: {
      user: 'userOverThreshold1',
      troupe: 'troupe1',
      text: 'over_threshold_message (user)',
      sent: new Date()
    },
    messageReportUserOverThreshold1: {
      user: 'user2',
      message: 'messageToReportUserOverThreshold1',
      sent: Date.now(),
      weight: vanillaChatReportService.BAD_USER_THRESHOLD
    },

    userOldOverThreshold1: {
      _id: mongoUtils.createTestIdForTimestampString(Date.now() - 500 * ONE_DAY_TIME)
    },
    messageToReportUserOldOverThreshold1: {
      user: 'userOldOverThreshold1',
      troupe: 'troupe1',
      text: 'over_threshold_message (old user)',
      sent: new Date()
    },
    messageReportUserOldOverThreshold1: {
      user: 'user2',
      message: 'messageToReportUserOldOverThreshold1',
      sent: Date.now(),
      weight: vanillaChatReportService.BAD_USER_THRESHOLD
    },

    userGood1: {},
    messageToReportUserGood1: {
      user: 'userGood1',
      troupe: 'troupe1',
      text: 'over_bad_user_threshold_message',
      sent: new Date()
    },
    messageReportUserGoodOverBadThreshold1: {
      user: 'user2',
      message: 'messageToReportUserGood1',
      sent: Date.now(),
      weight: vanillaChatReportService.BAD_USER_THRESHOLD
    }
  });

  beforeEach(function() {
    statsLog = [];
    removeAllMessagesForUserIdSpy = sinon.spy();
    deleteMessageFromRoomSpy = sinon.spy();
    hellbanUserSpy = sinon.spy();

    chatReportService = proxyquireNoCallThru('../', {
      'gitter-web-env': Object.assign(require('gitter-web-env'), {
        stats: {
          event: function(message) {
            statsLog.push(message);
          }
        }
      }),
      'gitter-web-chats': Object.assign(require('gitter-web-chats'), {
        removeAllMessagesForUserId: removeAllMessagesForUserIdSpy,
        deleteMessageFromRoom: deleteMessageFromRoomSpy
      }),
      'gitter-web-users': Object.assign(require('gitter-web-chats'), {
        hellbanUser: hellbanUserSpy
      })
    });
  });

  describe('getReportSumForUser', function() {
    it('sum reports across all of their messages from many users', function() {
      return chatReportService.getReportSumForUser(fixture.userBad1.id).then(function(sum) {
        assert.strictEqual(sum, 3);
      });
    });
  });

  describe('getReportSumForMessage', function() {
    it('sum reports from many users', function() {
      return chatReportService.getReportSumForMessage(fixture.message1.id).then(function(sum) {
        assert.strictEqual(sum, 2);
      });
    });
  });

  describe('newReport', function() {
    it('report another users message', function() {
      return chatReportService.newReport(fixture.user2, fixture.message1.id).then(function(report) {
        assert.equal(report.sent.getTime(), fixture.messageReport1.sent.getTime());
        assert.strictEqual(report.weight, fixture.messageReport1.weight);
        assert(mongoUtils.objectIDsEqual(report.reporterUserId, fixture.user2._id));
        assert(mongoUtils.objectIDsEqual(report.messageId, fixture.message1._id));
        assert(mongoUtils.objectIDsEqual(report.messageUserId, fixture.message1.fromUserId));
        assert.strictEqual(report.text, fixture.message1.text);
      });
    });

    it('unable to report own message', function() {
      return chatReportService
        .newReport(fixture.userBad1, fixture.message1.id)
        .catch(function(err) {
          assert.strictEqual(err.status, 403);
        });
    });

    it('detected bad message', function() {
      return chatReportService
        .newReport(fixture.user3, fixture.messageToReportOverThreshold1.id)
        .then(function() {
          assert(
            statsLog.some(function(entry) {
              return entry === 'new_bad_message_from_reports';
            })
          );

          assert.strictEqual(hellbanUserSpy.callCount, 0);
          assert.strictEqual(deleteMessageFromRoomSpy.callCount, 1);
        });
    });

    it('detected bad user that is new will clear messages', function() {
      return chatReportService
        .newReport(fixture.user3, fixture.messageToReportUserOverThreshold1.id)
        .then(function() {
          assert(
            statsLog.some(function(entry) {
              return entry === 'new_bad_user_from_reports';
            })
          );

          assert.strictEqual(hellbanUserSpy.callCount, 1);
          assert.strictEqual(removeAllMessagesForUserIdSpy.callCount, 1);
        });
    });

    it('detected bad user but is old enough to not automatically clear messages', function() {
      return chatReportService
        .newReport(fixture.user3, fixture.messageToReportUserOldOverThreshold1.id)
        .then(function() {
          assert(
            statsLog.some(function(entry) {
              return entry === 'new_bad_user_from_reports';
            })
          );

          assert.strictEqual(hellbanUserSpy.callCount, 1);
          assert.strictEqual(removeAllMessagesForUserIdSpy.callCount, 0);
        });
    });

    it('utilizes good user threshold for good user', function() {
      chatReportService.GOOD_USER_IDS.push('' + fixture.userGood1._id);

      return (
        chatReportService
          // The message already has a report that is over the BAD_USER_THRESHOLD,
          // but when we report it again, the user is safe because it is in the good user list(GOOD_USER_IDS)
          .newReport(fixture.user3, fixture.messageToReportUserGood1.id)
          .then(function() {
            assert.strictEqual(hellbanUserSpy.callCount, 0);
            assert.strictEqual(removeAllMessagesForUserIdSpy.callCount, 0);
          })
      );
    });
  });
});
