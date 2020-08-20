'use strict';

var env = require('gitter-web-env');
var config = env.config;
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var crypto = require('crypto');
var logger = env.logger.get('spam-detection');

var redisClient = env.ioredis.createClient(config.get('redis_nopersist'), {
  keyPrefix: 'spam:'
});

var TTL = 12 * 60 * 60;

function defineCommand(name, script, keys) {
  redisClient.defineCommand(name, {
    lua: fs.readFileSync(path.join(__dirname, '..', 'redis-lua', script + '.lua')),
    numberOfKeys: keys
  });
}

defineCommand('spamDetectionCountChatForUser', 'count-chat-for-user', 1);

function getWarnAndBanThresholds(text) {
  // This should catch emojis etc
  if (text.length < 10) {
    return {
      warn: 80,
      ban: 100
    };
  }

  if (text.length < 20) {
    return {
      warn: 16,
      ban: 20
    };
  }

  return {
    warn: 8,
    ban: 10
  };
}

function addHash(userId, hash, text) {
  var thresholds = getWarnAndBanThresholds(text);

  return redisClient
    .spamDetectionCountChatForUser('dup:' + String(userId), hash, TTL)
    .bind({
      thresholds: thresholds,
      text: text,
      userId: userId
    })
    .then(function(count) {
      var thresholds = this.thresholds;
      var userId = this.userId;
      var text = this.text;

      if (count > thresholds.warn) {
        logger.warn('User sending duplicate messages', {
          count: count,
          text: text,
          userId: userId
        });
      }

      return count > thresholds.ban;
    });
}
/**
 * Super basic spam detection
 */
function detect(userId, text) {
  var hash = crypto
    .createHash('md5')
    .update(text)
    .digest('hex');
  return addHash(userId, hash, text);
}

module.exports = Promise.method(detect);
