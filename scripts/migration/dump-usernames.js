#!/usr/bin/env node
'use strict' /* messy messy @lerouxb */;

/* eslint-disable */ var shutdown = require('shutdown');
var persistence = require('gitter-web-persistence');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var es = require('event-stream');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

function getUsernames() {
  return persistence.User.find({}, { username: 1 })
    .lean()
    .read(mongoReadPrefs.secondaryPreferred)
    .stream();
}

var usernameMap = {};
function run(callback) {
  getUsernames()
    .pipe(
      es.through(function(row) {
        usernameMap[row.username] = true;
      })
    )
    .on('end', function() {
      callback();
    })
    .on('error', function(error) {
      callback(error);
    });
}

function done(error) {
  if (error) {
    console.error(error);
    console.error(error.stack);
    process.exit(1);
  } else {
    shutdown.shutdownGracefully();
  }
}

onMongoConnect().then(function() {
  run(function(err) {
    if (!err) {
      console.log(JSON.stringify(usernameMap));
    }
    done(err);
  });
});
