#!/usr/bin/env node
/*jslint node: true */
'use strict';

// default log level is error
// can be changed with `env "logging:level=info" ./scripts/utils/find-users-by-email.js`
process.env['logging:level'] = process.env['logging:level'] || 'error';

var shutdown = require('shutdown');
var userService = require('gitter-web-users');

const opts = require('yargs')
  .option('email', {
    alias: 'e',
    required: true,
    description: 'Email of the user to find'
  })
  .help('help')
  .alias('help', 'h').argv;

const findUsers = email => userService.findAllByEmail(email).delay(5000);

const prepareOutput = users => {
  const initialMessage = users.length ? `Found ${users.length} users` : 'No user found!';
  const userList = users.map((user, index) => `[${index}] ${user._id} - ${user.username}`);
  return [initialMessage, ...userList].join('\n');
};

const performSearch = async () => {
  try {
    const users = await findUsers(opts.email);
    const output = prepareOutput(users);
    console.log(output);
    shutdown.shutdownGracefully(0);
  } catch (err) {
    console.error('Error: ' + err, err);
    shutdown.shutdownGracefully(1);
  }
};

performSearch();
