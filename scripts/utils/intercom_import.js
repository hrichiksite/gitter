#!/usr/bin/env node
'use strict';

var env = require('gitter-web-env');
var nconf = env.config;
var persistence = require('gitter-web-persistence');
var shutdown = require('shutdown');
var async = require('async');
var emailAddressService = require('gitter-web-email-addresses');

function getAllUsers(callback) {
  persistence.User.find(function(err, users) {
    if (err) console.log(err);
    callback('', users);
  });
}

getAllUsers(function(err, users) {
  if (nconf.get('stats:intercom')) {
    var Intercom = require('intercom.io');
    var options = {
      apiKey: nconf.get('stats:intercom:key'),
      appId: nconf.get('stats:intercom:app_id')
    };

    var intercom = new Intercom(options);
    console.log('[intercom] Importing users: ', users.length);

    async.eachLimit(
      users,
      20,
      function(user, callback) {
        if (user.isActive()) {
          var created_at = new Date(user._id.getTimestamp());
          emailAddressService(user).nodeify(function(err, email) {
            if (err) {
              console.log('*************** Email error ' + err);
              // return callback(err);
            }

            if (email) {
              console.log('Going to create a user in Intercom with ' + user.username);
              intercom.createUser(
                {
                  email: email,
                  user_id: user.id,
                  name: user.displayName,
                  created_at: created_at,
                  username: user.username
                  // "companies" : [
                  //   {
                  //     "id" : 6,
                  //     "name" : "Intercom",
                  //     "created_at" : 103201,
                  //     "plan" : "Messaging",
                  //     "monthly_spend" : 50
                  //   }
                  // ],
                },
                function(err /*, res*/) {
                  if (err) console.log(err);
                  console.log('Successfully added: ' + user.username);
                  callback();
                }
              );
            } else {
              console.log(
                'Skipping ' + user.username + ' because they have an email address of ' + user.email
              );
              callback();
            }
          });
        } else {
          console.log('Skipping ' + user.username + ' because they are ' + user.state);
          callback();
        }
      },
      function() {
        console.log('Shutting down gracefully');
        shutdown.shutdownGracefully();
      }
    );
  }
});
