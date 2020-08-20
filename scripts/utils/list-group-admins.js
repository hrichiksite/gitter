#!/usr/bin/env node
'use strict';

const shutdown = require('shutdown');

const groupService = require('gitter-web-groups');
const findGroupAdminUsers = require('./lib/find-group-admin-users');

const opts = require('yargs')
  .option('uri', {
    alias: 'u',
    required: true,
    description: 'URI of group to remove',
    string: true
  })
  .help('help')
  .alias('help', 'h').argv;

groupService
  .findByUri(opts.uri)
  .then(group => {
    if (!group) {
      throw new Error(`Group with URI ${group.uri} does not exist`);
    }

    console.log(`Processing ${group.uri}`);
    return findGroupAdminUsers(group);
  })
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    process.exit(1);
    shutdown.shutdownGracefully(1);
  });
