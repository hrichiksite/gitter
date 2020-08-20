'use strict';

var env = require('gitter-web-env');
var logger = env.logger.get('spam-detection');
var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var duplicateChatDetector = require('./duplicate-chat-detector');
var User = require('gitter-web-persistence').User;
var stats = env.stats;

var ONE_DAY_TIME = 24 * 60 * 60 * 1000; // One day
var PROBATION_PERIOD = 14 * ONE_DAY_TIME;

function hellbanUser(userId) {
  return User.update(
    { _id: userId },
    {
      $set: {
        hellbanned: true
      }
    }
  ).exec();
}
/**
 * Super basic spam detection
 */
function detect(user, parsedMessage) {
  // Once a spammer, always a spammer....
  if (user.hellbanned) return true;

  var userId = user._id;
  var userCreated = mongoUtils.getTimestampFromObjectId(userId);

  // Outside of the probation period? For now, let them do anything
  if (Date.now() - userCreated > PROBATION_PERIOD) {
    return false;
  }

  return duplicateChatDetector(userId, parsedMessage.text).tap(function(isSpamming) {
    if (!isSpamming) return;

    logger.warn('Auto spam detector to hellban user for suspicious activity', {
      userId: user._id,
      username: user.username,
      text: parsedMessage.text
    });

    stats.event('auto_hellban_user', {
      userId: user._id
    });

    return hellbanUser(userId);
  });
}

module.exports = {
  detect: Promise.method(detect)
};
