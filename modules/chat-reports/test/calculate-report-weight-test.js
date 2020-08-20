'use strict';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
const chatReportService = require('../');
const reportWeight = require('../lib/calculate-report-weight');

const ONE_DAY_TIME = 24 * 60 * 60 * 1000; // One day

describe('calculate-report-weight', function() {
  const fixture = fixtureLoader.setup({
    userNew: {},
    userNewAdmin: {},
    userOld: {
      _id: mongoUtils.createTestIdForTimestampString(Date.now() - 365 * ONE_DAY_TIME)
    },
    userOldAdmin: {
      _id: mongoUtils.createTestIdForTimestampString(Date.now() - 365 * ONE_DAY_TIME)
    },
    troupe1: {
      users: ['userNew', 'userNewAdmin', 'userOld', 'userOldAdmin'],
      securityDescriptor: {
        extraAdmins: ['userNewAdmin', 'userOldAdmin']
      }
    },
    message1: {
      user: 'userOld',
      troupe: 'troupe1',
      text: 'new_message',
      sent: new Date()
    },
    messageOld1: {
      user: 'userOld',
      troupe: 'troupe1',
      text: 'new_message',
      sent: new Date(Date.now() - 30 * ONE_DAY_TIME)
    }
  });

  describe('calculateUserAgeWeight', function() {
    it('new users have 0 weight', function() {
      assert.strictEqual(
        reportWeight.calculateUserAgeWeight({
          _id: mongoUtils.createTestIdForTimestampString(Date.now())
        }),
        0
      );
    });

    it('3 month users have some weight', function() {
      assert.strictEqual(
        reportWeight.calculateUserAgeWeight({
          _id: mongoUtils.createTestIdForTimestampString(Date.now() - 90 * ONE_DAY_TIME)
        }),
        0.6
      );
    });

    it('old users have full weight', function() {
      assert.strictEqual(
        reportWeight.calculateUserAgeWeight({
          _id: mongoUtils.createTestIdForTimestampString(Date.now() - 365 * ONE_DAY_TIME)
        }),
        1
      );
    });
  });

  describe('calculateMessageAgeWeight', function() {
    it('new messages are easily removed', function() {
      assert.strictEqual(
        reportWeight.calculateMessageAgeWeight({
          sent: new Date()
        }),
        1
      );
    });

    it('week old messages have some weight', function() {
      assert.strictEqual(
        reportWeight.calculateMessageAgeWeight({
          sent: new Date(Date.now() - 7 * ONE_DAY_TIME)
        }),
        0.5
      );
    });

    it("old messages can't be removed", function() {
      assert.strictEqual(
        reportWeight.calculateMessageAgeWeight({
          sent: new Date(Date.now() - 30 * ONE_DAY_TIME)
        }),
        0
      );
    });
  });

  describe('calculateReportWeight', function() {
    describe('new users', function() {
      it('have no power', function() {
        return reportWeight
          .calculateReportWeight(fixture.userNew, fixture.troupe1, fixture.message1)
          .then(function(weight) {
            assert.strictEqual(weight, 0);
          });
      });

      it('including admins have no power', function() {
        return reportWeight
          .calculateReportWeight(fixture.userNewAdmin, fixture.troupe1, fixture.message1)
          .then(function(weight) {
            assert.strictEqual(weight, 0);
          });
      });
    });

    it("old messages can't be removed", function() {
      return reportWeight
        .calculateReportWeight(fixture.userOldAdmin, fixture.troupe1, fixture.messageOld1)
        .then(function(weight) {
          assert.strictEqual(weight, 0);
        });
    });

    it('admin will prompt bad message', function() {
      return reportWeight
        .calculateReportWeight(fixture.userOldAdmin, fixture.troupe1, fixture.message1)
        .then(function(weight) {
          assert(weight >= chatReportService.BAD_MESSAGE_THRESHOLD);
        });
    });

    it('user reports a message', function() {
      return reportWeight
        .calculateReportWeight(fixture.userOld, fixture.troupe1, fixture.message1)
        .then(function(weight) {
          assert.strictEqual(weight, 1);
        });
    });
  });
});
