'use strict';

var env = require('gitter-web-env');
var config = env.config;

var GoogleStrategy = require('passport-google-oauth2').Strategy;
var userService = require('gitter-web-users');
var trackSignupOrLogin = require('../track-signup-or-login');
var updateUserLocale = require('../update-user-locale');
var passportLogin = require('../passport-login');
var identityService = require('gitter-web-identity');
var callbackUrlBuilder = require('./callback-url-builder');

function googleOauth2Callback(req, accessToken, refreshToken, params, profile, done) {
  var avatar = profile.photos[0].value; // is this always set?

  var googleUser = {
    username: profile.id + '_google',
    displayName: profile.displayName,
    gravatarImageUrl: avatar
  };
  var googleIdentity = {
    provider: identityService.GOOGLE_IDENTITY_PROVIDER,
    providerKey: profile.id,
    displayName: profile.displayName,
    email: profile.email && profile.email.toLowerCase(),
    // Google accessTokens only live one hour.
    accessToken: accessToken,
    // Google will only give you a refreshToken if you ask for offline access
    // and you force an approval prompt. So this will just be undefined for us.
    refreshToken: refreshToken,
    avatar: avatar
  };
  var user;
  return userService
    .findOrCreateUserForProvider(googleUser, googleIdentity)
    .then(function([_user, isNewUser]) {
      user = _user;

      trackSignupOrLogin(req, user, isNewUser, 'google');
      updateUserLocale(req, user);

      return passportLogin(req, user);
    })
    .then(result => done(null, result), error => done(error));
}

var googleStrategy = new GoogleStrategy(
  {
    clientID: config.get('googleoauth2:client_id'),
    clientSecret: config.get('googleoauth2:client_secret'),
    callbackURL: callbackUrlBuilder('google'),
    passReqToCallback: true
  },
  googleOauth2Callback
);

googleStrategy.name = 'google';

module.exports = googleStrategy;
