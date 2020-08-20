#!/usr/bin/env node
/*jslint node: true */
'use strict';

var presenceService = require('gitter-web-presence');
var userService = require('gitter-web-users');
var shutdown = require('shutdown');

var opts = require('yargs')
  .option('name', {
    alias: 'n',
    type: 'boolean',
    description: 'Display names'
  })
  .help('help')
  .alias('help', 'h').argv;

presenceService.listOnlineUsers(async function(err, userIds) {
  if (opts.name) {
    const users = await userService.findByIds(userIds);
    users.forEach(function(user) {
      console.log(user.displayName);
    });

    shutdown.shutdownGracefully();

    return;
  }

  userIds.forEach(function(userId) {
    console.log(userId);
  });
  shutdown.shutdownGracefully();
});
