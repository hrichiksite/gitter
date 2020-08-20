'use strict';

var env = require('gitter-web-env');
var stats = env.stats;

var _ = require('lodash');
var emailAddressService = require('gitter-web-email-addresses');
var useragentTagger = require('./user-agent-tagger');

// Use this whenever a user logs in again
module.exports = function trackUserLogin(req, user, provider) {
  return emailAddressService(user).then(function(email) {
    var properties = useragentTagger(req);

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
      }),
      properties
    );

    // NOTE: other stats calls also pass in source and googleAnalyticsUniqueId
    stats.event(
      'user_login',
      _.extend(
        {
          userId: user.id,
          method: provider + '_oauth',
          username: user.username
        },
        properties
      )
    );

    // Persist the new emails
    return user.save();
  });
};
