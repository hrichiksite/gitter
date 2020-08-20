#!/usr/bin/env node
/*jslint node: true */
'use strict';

var userService = require('gitter-web-users');
var shutdown = require('shutdown');
var shimPositionOption = require('../yargs-shim-position-option');

var opts = require('yargs')
  .option(
    'username',
    shimPositionOption({
      position: 0,
      required: true,
      description: 'username to hellban e.g trevorah',
      string: true
    })
  )
  .option('unban', {
    alias: 'u',
    type: 'boolean',
    description: 'unban user from hell'
  })
  .help('help')
  .alias('help', 'h').argv;

console.log(opts);

var banned = !opts.unban;

userService
  .findByUsername(opts.username)
  .then(function(user) {
    user.hellbanned = banned;
    return user.save();
  })
  .delay(5000)
  .then(function() {
    var action = banned ? 'banned to a special kind of hell' : 'redeemed to walk amongst us again';
    console.log(opts.username, 'has been', action);
  })
  .catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
