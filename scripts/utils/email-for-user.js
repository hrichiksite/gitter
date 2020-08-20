#!/usr/bin/env node
'use strict';

const shutdown = require('shutdown');
const userService = require('gitter-web-users');
const emailAddressService = require('gitter-web-email-addresses');

var opts = require('yargs')
  .option('username', {
    alias: 'u',
    required: true,
    description: 'Username of the user to remove',
    string: true
  })
  .help('help')
  .alias('help', 'h').argv;

userService
  .findByUsername(opts.username)
  .then(function(user) {
    return emailAddressService(user);
  })
  .then(function(email) {
    console.log(`Email for ${opts.username} is ${email}`);
  })
  .then(() => {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    process.exit(1);
    shutdown.shutdownGracefully(1);
  });
