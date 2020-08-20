#!/usr/bin/env node
/*jslint node: true */
'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var bayeux = require('../../server/web/bayeux');
var shutdown = require('shutdown');

var opts = require('yargs')
  .option('socketId', {
    alias: 's',
    required: true,
    description: 'Socket to destroy'
  })
  .help('help')
  .alias('help', 'h').argv;

bayeux.destroyClient(opts.socketId, function(err) {
  if (err) winston.error('Error disconnecting socket' + err, { exception: err });

  shutdown.shutdownGracefully();
});
