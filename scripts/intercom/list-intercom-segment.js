#!/usr/bin/env node
'use strict';

var shutdown = require('shutdown');
var intercom = require('gitter-web-intercom');
var getIntercomStream = require('intercom-stream');

var opts = require('yargs')
  .option('segment', {
    alias: 's',
    required: true,
    description: 'Id of the segment to list'
  })
  .help('help')
  .alias('help', 'h').argv;

var stream = getIntercomStream({ client: intercom.client, key: 'users' }, function() {
  return intercom.client.users.listBy({ segment_id: opts.segment });
});

stream
  .on('data', function(user) {
    console.log(user);
  })
  .on('end', function() {
    console.log('done');
    shutdown.shutdownGracefully();
  })
  .on('error', function die(error) {
    console.error(error);
    console.error(error.stack);
    shutdown.shutdownGracefully();
  });
