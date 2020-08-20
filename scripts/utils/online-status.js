#!/usr/bin/env node
/*jslint node: true */
'use strict';

var userService = require('gitter-web-users');
var presenceService = require('gitter-web-presence');
var shutdown = require('shutdown');
var shimPositionOption = require('../yargs-shim-position-option');

var opts = require('yargs')
  .option(
    'username',
    shimPositionOption({
      position: 0,
      required: true,
      description: 'username to look up e.g trevorah',
      string: true
    })
  )
  .help('help')
  .alias('help', 'h').argv;

userService
  .findByUsername(opts.username)
  .then(function(user) {
    return user._id;
  })
  .then(function(userId) {
    return presenceService.categorizeUsersByOnlineStatus([userId]).then(function(statusHash) {
      return !!statusHash[userId];
    });
  })
  .then(function(isOnline) {
    console.log(isOnline ? 'online' : 'offline');
  })
  .catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
