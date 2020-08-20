#!/usr/bin/env node
'use strict';

var Promise = require('bluebird');
var shutdown = require('shutdown');
var through2Concurrent = require('through2-concurrent');
var persistence = require('gitter-web-persistence');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');

function fillTwitterUsernames() {
  return new Promise(function(resolve, reject) {
    // There are 7482 matches in production at the time of writing
    var stream = persistence.Identity.find({
      provider: 'twitter',
      username: {
        $exists: false
      }
    })
      .select('userId')
      .lean()
      .slaveOk()
      .stream();

    var pipe = stream.pipe(
      through2Concurrent.obj({ maxConcurrency: 10 }, function(identity, enc, cb) {
        return persistence.User.findById(identity.userId)
          .select('username')
          .lean()
          .slaveOk()
          .exec()
          .then(function(user) {
            if (!user) {
              console.log('User ' + identity.userId + ' not found.');
              return;
            }

            var username = user.username.replace(/_twitter$/, '');
            console.log(user.username, '->', username);

            var query = { _id: identity._id };
            var update = {
              $set: {
                username: username
              }
            };
            return persistence.Identity.findOneAndUpdate(query, update).exec();
          })
          .nodeify(cb);
      })
    );

    pipe.on('data', function() {});

    pipe.on('end', function() {
      resolve();
    });

    pipe.on('error', function(err) {
      reject(err);
    });
  });
}

onMongoConnect()
  .then(function() {
    return fillTwitterUsernames();
  })
  .then(function() {
    console.log('DONE');
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error('error:', err);
    console.error('stack:', err.stack);
    shutdown.shutdownGracefully(1);
  });
