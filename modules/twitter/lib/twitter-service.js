'use strict';

var debug = require('debug')('gitter:app:twitter:service');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var querystring = require('querystring');
var StatusError = require('statuserror');

function escapeTweet(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, escape);
}

var FOLLOWER_API_ENDPOINT = 'https://api.twitter.com/1.1/followers/list.json';
var FAVORITES_API_ENDPOINT = 'https://api.twitter.com/1.1/favorites/list.json';
var TWEET_API_ENDPOINT = 'https://api.twitter.com/1.1/statuses/update.json';

function TwitterService(consumerKey, consumerSecret, accessToken, accessTokenSecret) {
  this.consumerKey = consumerKey;
  this.consumerSecret = consumerSecret;
  this.accessToken = accessToken;
  this.accessTokenSecret = accessTokenSecret;
}

TwitterService.prototype.findFollowers = function(username) {
  return request({
    url: FOLLOWER_API_ENDPOINT,
    json: true,
    oauth: {
      consumer_key: this.consumerKey,
      consumer_secret: this.consumerSecret,
      token: this.accessToken,
      token_secret: this.accessTokenSecret
    },
    qs: {
      screen_name: username
    }
  }).then(function(results) {
    debug('Twitter API results: %j', results && results.body);
    if (!results.body || !results.body.users) {
      return [];
    }

    return results.body.users;
  });
};

TwitterService.prototype.findFavorites = function() {
  return request({
    url: FAVORITES_API_ENDPOINT,
    json: true,
    oauth: {
      consumer_key: this.consumerKey,
      consumer_secret: this.consumerSecret,
      token: this.accessToken,
      token_secret: this.accessTokenSecret
    }
  });
};

TwitterService.prototype.sendTweet = function(status) {
  return request({
    method: 'POST',
    url: TWEET_API_ENDPOINT,
    json: true,
    oauth: {
      consumer_key: this.consumerKey,
      consumer_secret: this.consumerSecret,
      token: this.accessToken,
      token_secret: this.accessTokenSecret
    },
    encoding: null,
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: querystring.stringify(
      {
        status: status
      },
      '&',
      '=',
      {
        encodeURIComponent: escapeTweet
      }
    )
  }).then(function(res) {
    if (res.statusCode === 200) {
      return;
    }

    var errorMessage = res.body;
    if (res.body.errors) {
      errorMessage = (res.body.errors || []).reduce(function(errorString, error) {
        return (
          errorString + (errorString.length > 0 ? ' -- ' : '') + error.code + ' ' + error.message
        );
      }, '');
    }
    var errorString = 'Status: ' + res.statusCode + ' -- ' + errorMessage;

    throw new StatusError(400, errorString);
  });
};

module.exports = TwitterService;
