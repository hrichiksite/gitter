'use strict';

var trackNewUser = require('./track-new-user');
var trackUserLogin = require('./track-user-login');

module.exports = function trackSignupOrLogin(req, user, isNewUser, provider) {
  if (isNewUser) {
    trackNewUser(req, user, provider);
  } else {
    trackUserLogin(req, user, provider);
  }
};
