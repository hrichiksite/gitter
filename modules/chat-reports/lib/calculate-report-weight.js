'use strict';

const debug = require('debug')('gitter:app:calculate-report-weight');
const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
const policyFactory = require('gitter-web-permissions/lib/policy-factory');

const ONE_DAY_TIME = 24 * 60 * 60 * 1000; // One day

// Make it harder for new users to do as much damage
// 0 - 1
function calculateUserAgeWeight(fromUser) {
  let userAgeWeight = 0;
  const userCreated = mongoUtils.getTimestampFromObjectId(fromUser._id || fromUser.id);

  if (Date.now() - userCreated < 2 * ONE_DAY_TIME) {
    userAgeWeight = 0;
  } else if (Date.now() - userCreated < 14 * ONE_DAY_TIME) {
    userAgeWeight = 0.15;
  } else if (Date.now() - userCreated < 60 * ONE_DAY_TIME) {
    userAgeWeight = 0.3;
  } else if (Date.now() - userCreated < 180 * ONE_DAY_TIME) {
    userAgeWeight = 0.6;
  } else if (Date.now() - userCreated >= 180 * ONE_DAY_TIME) {
    userAgeWeight = 1;
  }

  return userAgeWeight;
}

// Make it harder to delete older messages
// 0 - 1
function calculateMessageAgeWeight(message) {
  let messageAgeWeight = 1;
  const messageCreated = message.sent.getTime();

  if (Date.now() - messageCreated < 2 * ONE_DAY_TIME) {
    messageAgeWeight = 1;
  } else if (Date.now() - messageCreated < 21 * ONE_DAY_TIME) {
    messageAgeWeight = 0.5;
  } else if (Date.now() - messageCreated >= 21 * ONE_DAY_TIME) {
    messageAgeWeight = 0;
  }

  return messageAgeWeight;
}

function calculateReportWeight(fromUser, room, message) {
  let baseWeight = 1;

  return policyFactory
    .createPolicyForRoom(fromUser, room)
    .then(function(policy) {
      return policy.canAdmin();
    })
    .then(function(canAdmin) {
      if (canAdmin) {
        baseWeight = 2.5;
      }

      const userAgeWeight = calculateUserAgeWeight(fromUser);
      const messageAgeWeight = calculateMessageAgeWeight(message);

      const resultantWeight = baseWeight * userAgeWeight * messageAgeWeight;
      debug(
        `calculateReportWeight=${resultantWeight}, baseWeight=${baseWeight}, userAgeWeight=${userAgeWeight}, messageAgeWeight=${messageAgeWeight}`
      );

      return resultantWeight;
    });
}

module.exports = {
  calculateUserAgeWeight: calculateUserAgeWeight,
  calculateMessageAgeWeight: calculateMessageAgeWeight,
  calculateReportWeight: calculateReportWeight
};
