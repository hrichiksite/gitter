'use strict';

var BackendMuxer = require('gitter-web-backend-muxer');
var Promise = require('bluebird');

var env = require('gitter-web-env');
var config = env.config;

var TEST_EMAIL = config.get('email:toAddress');

module.exports = function(user, options) {
  if (!user) return Promise.reject(new Error('User required'));

  // test email address, should be set in `config.user-overrides.json`
  if (TEST_EMAIL) return Promise.resolve(TEST_EMAIL);

  if (!options) options = {};

  if (options.preferInvitedEmail && user.invitedEmail) return Promise.resolve(user.invitedEmail);

  var backendMuxer = new BackendMuxer(user);
  return backendMuxer.getEmailAddress(options);
};
