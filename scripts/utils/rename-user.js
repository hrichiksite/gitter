#!/usr/bin/env node

'use strict';

var shutdown = require('shutdown');
var userService = require('gitter-web-users');
var StatusError = require('statuserror');

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('old', {
    alias: 'o',
    required: true,
    description: 'Old username for the user'
  })
  .option('new', {
    alias: 'n',
    required: true,
    description: 'New username for the user'
  })
  .help('help')
  .alias('help', 'h').argv;

userService
  .findByUsername(opts.old)
  .then(function(user) {
    if (!user) {
      console.log('not found');
      throw new StatusError(404, 'user not found');
    }
    user.username = opts.new;
    return user.save();
  })
  .then(function() {
    console.log('done');
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
