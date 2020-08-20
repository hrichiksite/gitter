'use strict';

var env = require('gitter-web-env');
var config = env.config;

var TwitterStrategy = require('passport-twitter');
var userService = require('gitter-web-users');
var trackSignupOrLogin = require('../track-signup-or-login');
var updateUserLocale = require('../update-user-locale');
var passportLogin = require('../passport-login');
var identityService = require('gitter-web-identity');
var callbackUrlBuilder = require('./callback-url-builder');

//function twitterOauthCallback(req, accessToken, refreshToken, params, profile, done) {
function twitterOauthCallback(req, token, tokenSecret, profile, done) {
  var avatar = profile.photos[0].value; // is this always set?

  var twitterUser = {
    username: profile.username + '_twitter',
    displayName: profile.displayName,
    gravatarImageUrl: avatar
  };
  var twitterIdentity = {
    provider: identityService.TWITTER_IDENTITY_PROVIDER,
    providerKey: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    // NOTE: doesn't look like passport is parsing out the email address if we
    // set userProfileURL for some reason. So profile.email is not set.
    email: profile._json.email && profile._json.email.toLowerCase(),
    accessToken: token,
    accessTokenSecret: tokenSecret,
    avatar: avatar
  };

  return userService
    .findOrCreateUserForProvider(twitterUser, twitterIdentity)
    .then(function([user, isNewUser]) {
      trackSignupOrLogin(req, user, isNewUser, 'twitter');
      updateUserLocale(req, user);

      return passportLogin(req, user);
    })
    .then(result => done(null, result), error => done(error));
}

var twitterStrategy = new TwitterStrategy(
  {
    consumerKey: config.get('twitteroauth:consumer_key'),
    consumerSecret: config.get('twitteroauth:consumer_secret'),
    userProfileURL:
      'https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true',
    callbackURL: callbackUrlBuilder('twitter'),
    passReqToCallback: true
  },
  twitterOauthCallback
);

twitterStrategy.name = 'twitter';

module.exports = twitterStrategy;
