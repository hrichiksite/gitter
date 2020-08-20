#!/usr/bin/env node
'use strict';

var shutdown = require('shutdown');
var intercom = require('gitter-web-intercom');

var opts = require('yargs')
  .option('id', {
    required: false,
    description: 'Intercom user id'
  })
  .option('user_id', {
    required: false,
    description: 'Mongo user id'
  })
  .option('email', {
    required: false
  })
  .help('help')
  .alias('help', 'h').argv;

if (!opts.id && !opts.user_id && !opts.email) {
  throw new Error('id, user_id or email required.');
}

intercom.client.users
  .find(opts)
  .then(function(response) {
    var user = response.body;
    console.log(user);
  })
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    shutdown.shutdownGracefully(1);
  });
