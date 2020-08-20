#!/usr/bin/env node

'use strict';

var shutdown = require('shutdown');
var collaboratorsService = require('gitter-web-collaborators');
var userService = require('gitter-web-users');

var opts = require('yargs')
  .option('username', {
    alias: 'u',
    required: true,
    description: 'Username to find suggestions for',
    string: true
  })
  .option('type', {
    description: "null, 'GH_REPO', 'GH_ORG'"
  })
  .option('linkPath', {
    description: 'Vendor path to find backing object on their platform according to the type'
  })
  .help('help')
  .alias('help', 'h').argv;

userService
  .findByUsername(opts.username)
  .then(function(user) {
    if (!user) {
      console.log('User not found with given username', opts.username);
      throw new Error('User not found with given username' + opts.username);
    }

    return collaboratorsService
      .findCollaborators(user, opts.type || null, opts.linkPath || null)
      .then(function(suggestions) {
        console.log('Suggestions', suggestions);
        return suggestions;
      })
      .catch(function(err) {
        console.log('err', err, err.stack);
        throw err;
      });
  })
  .delay(1000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .done();
