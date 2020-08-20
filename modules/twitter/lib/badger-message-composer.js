'use strict';

var _ = require('lodash');
var TWEET_MAX_CHARACTER_LIMIT = 140;

function countMaxUsernamesForTweet(mentionList, size) {
  var count = 0;
  var characters = 0;
  while (count < mentionList.length) {
    var nextTwitterUserLength = mentionList[count].length;

    if (count > 0) {
      characters += nextTwitterUserLength + 1; // Need to include a space separator
    } else {
      characters += nextTwitterUserLength;
    }

    if (characters >= size) {
      return count;
    }

    count++;
  }

  return count;
}

function composeTweetAndDequeue(invitingUserName, mentionList, name, url) {
  var baseMessagePre = 'Hey ';
  var baseMessagePost =
    " you've been invited to the " + name + ' community by ' + invitingUserName + '.\n' + url;
  var baseMessageLength = baseMessagePre.length + baseMessagePost.length;

  var count = countMaxUsernamesForTweet(mentionList, TWEET_MAX_CHARACTER_LIMIT - baseMessageLength);
  var usernames = mentionList.slice(0, count);
  mentionList.splice(0, count);

  return baseMessagePre + usernames.join(' ') + baseMessagePost;
}

function badgerMessageComposer(invitingUserName, mentionList, name, url) {
  if (!mentionList.length) return [];
  mentionList = _.uniq(mentionList);

  var tweets = [];
  while (mentionList.length) {
    var tweet = composeTweetAndDequeue(invitingUserName, mentionList, name, url);
    if (tweet) {
      tweets.push(tweet);
    }
  }

  return tweets;
}

module.exports = badgerMessageComposer;
