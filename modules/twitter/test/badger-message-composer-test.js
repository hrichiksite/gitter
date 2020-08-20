'use strict';

var badgerMessageComposer = require('../lib/badger-message-composer');
var assert = require('assert');
var _ = require('lodash');

function reportTooLong(tweets) {
  return tweets
    .filter(function(tweet) {
      return tweet.length > 140;
    })
    .map(function(tweet) {
      return { length: tweet.length, tweet: tweet };
    });
}

describe('badger-message-composer', function() {
  it('should handle empty', function() {
    var tweets = badgerMessageComposer('@suprememoocow', [], 'bob', 'bob/bob');
    assert.deepEqual(tweets, []);
  });

  it('should handle a single user', function() {
    var tweets = badgerMessageComposer('@suprememoocow', ['@billy'], 'bob', 'bob/bob');
    assert.deepEqual(tweets, [
      "Hey @billy you've been invited to the bob community by @suprememoocow.\nbob/bob"
    ]);
  });

  it('should handle a duplicate users', function() {
    var tweets = badgerMessageComposer('@suprememoocow', ['@billy', '@billy'], 'bob', 'bob/bob');
    assert.deepEqual(tweets, [
      "Hey @billy you've been invited to the bob community by @suprememoocow.\nbob/bob"
    ]);
  });

  it('should handle a two users', function() {
    var tweets = badgerMessageComposer('@suprememoocow', ['@billy', '@bob'], 'bob', 'bob/bob');
    assert.deepEqual(tweets, [
      "Hey @billy @bob you've been invited to the bob community by @suprememoocow.\nbob/bob"
    ]);
  });

  it('should handle many users with short usernames', function() {
    var usernames = _.range(64).map(function(i) {
      return '@' + i.toString(36);
    });

    var tweets = badgerMessageComposer('@suprememoocow', usernames, 'bob', 'bob/bob');
    assert.deepEqual(reportTooLong(tweets), []);
  });

  it('should handle many users with long usernames', function() {
    var usernames = _.range(64).map(function(i) {
      return '@' + _.repeat('a', i % 7) + '_' + i.toString(36);
    });

    var tweets = badgerMessageComposer('@suprememoocow', usernames, 'bob', 'bob/bob');
    assert.deepEqual(reportTooLong(tweets), []);
  });
});
