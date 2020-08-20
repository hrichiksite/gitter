#!/usr/bin/env node
/*jslint node: true */
'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var appEvents = require('gitter-web-appevents');
var userService = require('gitter-web-users');
var shutdown = require('shutdown');

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('user', {
    alias: 'u',
    type: 'array',
    required: false,
    description: 'Send message to userId'
  })
  .option('email', {
    alias: 'e',
    type: 'array',
    required: false,
    description: 'Send message to email address'
  })
  .option('title', {
    alias: 'd',
    required: true,
    description: 'Title'
  })
  .option('message', {
    alias: 'm',
    required: true,
    description: 'Message to send'
  })
  .option('link', {
    alias: 'l',
    required: false,
    description: 'Link'
  })
  .option('sound', {
    alias: 's',
    description: 'Sound to send'
  })
  .help('help')
  .alias('help', 'h').argv;

if (opts.user) {
  appEvents.userNotification({
    userId: opts.user,
    title: opts.title,
    text: opts.message,
    link: opts.link,
    sound: opts.sound
  });
  shutdown.shutdownGracefully();
} else {
  if (!opts.email) {
    winston.error('Either a userId or email address is requireId');
    process.exit(1);
  }
  userService.findByEmail('' + opts.email, function(err, user) {
    if (err) {
      winston.error('Error', err);
      process.exit(1);
    }
    if (!user) {
      winston.error('No user with email address' + opts.email);
      process.exit(1);
    }

    appEvents.userNotification({
      userId: user.id,
      title: opts.title,
      text: opts.message,
      link: opts.link,
      sound: opts.sound
    });

    shutdown.shutdownGracefully();
  });
}
