'use strict';

const _ = require('lodash');
var env = require('gitter-web-env');
var stats = env.stats;

var emailAddressService = require('gitter-web-email-addresses');
var gaCookieParser = require('./ga-cookie-parser');

// Use this whenever a user first signs up.
module.exports = function trackNewUser(req, user, provider) {
  // NOTE: tracking a signup after an invite is separate to this
  emailAddressService(user).then(function(email) {
    const emailList = user.emails || [];
    emailList.unshift(email);
    // We are sanitizing the data a bit here so the database
    // doesn't store `null` and duplicate case different emails
    const lowerCaseEmailList = emailList.filter(email => !!email).map(email => email.toLowerCase());
    user.emails = _.uniq(lowerCaseEmailList);

    stats.userUpdate(
      Object.assign({}, user, {
        // this is only set because stats.userUpdate requires it
        email: email
      })
    );

    // NOTE: other stats calls also pass in properties
    stats.event('new_user', {
      userId: user.id,
      email: email,
      method: provider + '_oauth',
      username: user.username,
      source: req.session.source,
      googleAnalyticsUniqueId: gaCookieParser(req)
    });

    // Persist the new emails
    return user.save();
  });
};
