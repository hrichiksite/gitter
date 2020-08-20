'use strict';

var Promise = require('bluebird');
var env = require('gitter-web-env');
var config = env.config;
var TwitterService = require('./twitter-service');
var badgerMessageComposer = require('./badger-message-composer');
var debug = require('debug')('gitter:app:twitter:badger');

var CONSUMER_KEY = config.get('twitterbadger:consumer_key');
var CONSUMER_SECRET = config.get('twitterbadger:consumer_secret');
var BADGER_ACCESS_TOKEN = config.get('twitterbadger:access_token');
var BADGER_ACCESS_TOKEN_SECRET = config.get('twitterbadger:access_token_secret');

var twitterService = new TwitterService(
  CONSUMER_KEY,
  CONSUMER_SECRET,
  BADGER_ACCESS_TOKEN,
  BADGER_ACCESS_TOKEN_SECRET
);

var DEVELOPMENT_TWITTER_ALLOWED = [
  'gitchat',
  'WeAreTroupe',
  'GitterBadger',
  'mydigitalself',
  'suprememoocow',
  'trevorah_',
  'MadLittleMods',
  '__leroux',
  'CutAndPastey',
  'escociao',
  'koholaa',
  'NeverGitter',
  'TestyTestymike'
].reduce(function(memo, twitterUsername) {
  memo[twitterUsername.toLowerCase()] = true;
  return memo;
}, {});

var userFilter;
if (process.env.NODE_ENV === 'prod') {
  userFilter = function() {
    return true;
  };
} else {
  userFilter = function(user) {
    if (!user) return false;
    if (!user.twitterUsername) return false;

    // Some mocked users
    if (/GitterTestUser/.test(user.twitterUsername)) {
      return true;
    }

    return DEVELOPMENT_TWITTER_ALLOWED[user.twitterUsername.toLowerCase()];
  };
}

function sendUserInviteTweets(invitingUser, users, name, url) {
  if (!invitingUser) {
    throw new Error('No user provided to show as the person inviting other users');
  }

  if (!url) {
    throw new Error('No url provided to point users to');
  }

  var mentionList = users
    .filter(userFilter)
    .filter(function(user) {
      return user && user.twitterUsername;
    })
    .map(function(user) {
      return '@' + user.twitterUsername;
    });

  if (!mentionList) return [];

  var invitingUserName = invitingUser.twitterUsername
    ? '@' + invitingUser.twitterUsername
    : invitingUser.username;
  var tweets = badgerMessageComposer(invitingUserName, mentionList, name, url);

  debug('Sending tweets: %j', tweets);
  return Promise.map(
    tweets,
    function(tweet) {
      return twitterService.sendTweet(tweet).return(tweet);
    },
    { concurrency: 1 }
  );
}

module.exports = {
  sendUserInviteTweets: Promise.method(sendUserInviteTweets)
};
