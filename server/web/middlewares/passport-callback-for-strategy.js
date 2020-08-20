'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var errorReporter = env.errorReporter;

var passport = require('passport');
var client = require('gitter-web-utils/lib/redis').getClient();
var lock = require('redis-lock')(client);
var validatedMessage = require('../validated-message');

module.exports = function passportCallbackForStrategy(strategy, options) {
  var handler = passport.authorize(strategy, options);
  return function(req, res, next) {
    var code = req.query.code;
    lock('oalock:' + code, function(done) {
      handler(req, res, function(err) {
        done(function() {
          if (err) {
            stats.event('login_failure');

            var errorOptions = {
              additionalErrorInfo: err.toString(), // passportjs.InternalOAuthError will return additional information in it's toString
              username: req.user && req.user.username,
              url: req.url,
              userHasSession: !!req.session
            };
            errorOptions[strategy + 'CallbackFailed'] = 'failed';
            errorReporter(err, errorOptions, { module: 'login-handler' });

            if (strategy.indexOf('upgrade') >= 0) {
              res.redirect('/login/upgrade-failed');
            } else {
              /* For some reason, the user is now logged in, just continue as normal */
              var user = req.user;
              if (user) {
                if (req.session && req.session.returnTo) {
                  res.redirect(req.session.returnTo);
                } else {
                  res.redirect('/' + user.username);
                }
                return;
              }

              if (err.message) {
                var check = validatedMessage.getCheck(err.message);
                res.redirect(
                  '/login/failed?message=' +
                    encodeURIComponent(err.message) +
                    '&check=' +
                    encodeURIComponent(check)
                );
              } else {
                res.redirect('/login/failed');
              }
            }
          } else {
            next();
          }
        });
      });
    });
  };
};
