'use strict';

var debug = require('debug')('gitter:app:collaborators');
var _ = require('lodash');
var TwitterService = require('gitter-web-twitter');
var identityService = require('gitter-web-identity');
var avatars = require('gitter-web-avatars');
var env = require('gitter-web-env');
var config = env.config;

var CONSUMER_KEY = config.get('twitteroauth:consumer_key');
var CONSUMER_SECRET = config.get('twitteroauth:consumer_secret');

function TwitterUserCollaboratorService(user, identity) {
  this.user = user;
  this.identity = identity;
}

TwitterUserCollaboratorService.prototype.findCollaborators = function() {
  var username = this.identity.username;
  var twitterService = new TwitterService(
    CONSUMER_KEY,
    CONSUMER_SECRET,
    this.identity.accessToken,
    this.identity.accessTokenSecret
  );

  return twitterService
    .findFollowers(username)
    .then(function(followers) {
      debug('Twitter followers', followers.length, followers);
      followers.sort(function(a, b) {
        return b.followers_count - a.followers_count;
      });

      followers = followers.slice(0, 20);

      return _.map(followers, function(follower) {
        return {
          displayName: follower.name,
          externalId: follower.screen_name,
          avatarUrl: avatars.getForTwitterUrl(follower.profile_image_url_https),
          type: identityService.TWITTER_IDENTITY_PROVIDER
        };
      });
    })
    .catch(function(err) {
      debug('Ran into error requesting followers', err, err.stack);
      return [];
    });
};

module.exports = TwitterUserCollaboratorService;
