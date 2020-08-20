'use strict';

var env = require('gitter-web-env');
var config = env.config;

var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
var userService = require('gitter-web-users');
var trackSignupOrLogin = require('../track-signup-or-login');
var updateUserLocale = require('../update-user-locale');
var passportLogin = require('../passport-login');
var identityService = require('gitter-web-identity');
var callbackUrlBuilder = require('./callback-url-builder');

function linkedinOauth2Callback(req, accessToken, refreshToken, profile, done) {
  var avatar = profile.photos[0].value; // is this always set?

  var linkedinUser = {
    username: profile.id + '_linkedin',
    displayName: profile.displayName,
    gravatarImageUrl: avatar
  };
  var linkedinIdentity = {
    provider: identityService.LINKEDIN_IDENTITY_PROVIDER,
    providerKey: profile.id,
    displayName: profile.displayName,
    email: profile.email && profile.email.toLowerCase(),
    // LinkedIn accessTokens only live 60 days
    accessToken: accessToken,
    // appears to be undefined for LinkedIn
    //https://github.com/auth0/passport-linkedin-oauth2/issues/18
    refreshToken: refreshToken,
    avatar: avatar
  };

  return userService
    .findOrCreateUserForProvider(linkedinUser, linkedinIdentity)
    .then(function([user, isNewUser]) {
      trackSignupOrLogin(req, user, isNewUser, 'linkedin');
      updateUserLocale(req, user);

      return passportLogin(req, user);
    })
    .then(result => done(null, result), error => done(error));
}

var linkedInStrategy = new LinkedInStrategy(
  {
    clientID: config.get('linkedinoauth2:client_id'),
    clientSecret: config.get('linkedinoauth2:client_secret'),
    callbackURL: callbackUrlBuilder('linkedin'),
    // see https://github.com/auth0/passport-linkedin-oauth2/issues/2
    // (scope only works here and not when calling passport.authorize)
    scope: ['r_basicprofile', 'r_emailaddress'],
    passReqToCallback: true
  },
  linkedinOauth2Callback
);

linkedInStrategy.name = 'linkedin';

module.exports = linkedInStrategy;
