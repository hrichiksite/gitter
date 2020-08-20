#!/usr/bin/env node
/*jslint node: true, unused:true */
'use strict';

var shutdown = require('shutdown');
var Promise = require('bluebird');
var env = require('gitter-web-env');
var userService = require('gitter-web-users');
var emailService = require('gitter-web-email-addresses');

env.installUncaughtExceptionHandler();

var CliOutput = require('./cli-output');

var cliOutput = new CliOutput(
  {
    userId: { width: 32 },
    username: { width: 20 },
    email: { width: 32 }
  },
  {
    all: { flag: true },
    usernames: { flag: true },
    userIds: { flag: true, default: true }
  }
);

var opts = cliOutput.opts;

function getUsers(opts) {
  if (opts.usernames) {
    return userService.findByUsernames(opts._);
  } else {
    return userService.findByIds(opts._);
  }
}

function attachEmailAdresses(users) {
  var promises = users.map(function(user) {
    return emailService(user).then(function(emailAdress) {
      user.email = emailAdress;
      return user;
    });
  });

  return Promise.all(promises);
}

function printResults(users) {
  cliOutput.headers();

  users.forEach(function(user) {
    cliOutput.row({
      userId: user.id,
      username: user.username,
      email: user.email
    });
  });
}

function die(err) {
  if (err) {
    console.error(err);
  }

  shutdown.shutdownGracefully(err ? 1 : 0);
}

getUsers(opts)
  .then(attachEmailAdresses)
  .then(printResults)
  .then(die)
  .catch(die);
