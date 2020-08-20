#!/usr/bin/env node
'use strict';

var shutdown = require('shutdown');
var userService = require('gitter-web-users');
var StatusError = require('statuserror');

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('username', {
    alias: 'u',
    required: true,
    description: 'Username to add staff status',
    string: true
  })
  .option('remove', {
    alias: 'r',
    description: 'Whether to remove staff status',
    type: 'boolean'
  })
  .help('help')
  .alias('help', 'h').argv;

userService
  .findByUsername(opts.username)
  .then(function(user) {
    if (!user) {
      console.log('not found');
      throw new StatusError(404, 'user not found');
    }

    var staffStatus = !opts.remove;
    user.staff = staffStatus;
    return user.save().then(function() {
      return staffStatus;
    });
  })
  .then(function(staffStatus) {
    console.log(opts.username + ' staff status:', staffStatus);
    console.log('done');
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
