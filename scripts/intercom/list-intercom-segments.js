#!/usr/bin/env node
'use strict';

var shutdown = require('shutdown');
var intercom = require('gitter-web-intercom');
var getIntercomStream = require('intercom-stream');

var stream = getIntercomStream({ client: intercom.client, key: 'segments' }, function() {
  return intercom.client.segments.list();
});

stream
  .on('data', function(segment) {
    console.log(segment.id, segment.name);
  })
  .on('end', function() {
    shutdown.shutdownGracefully();
  })
  .on('error', function die(error) {
    console.error(error);
    console.error(error.stack);
    shutdown.shutdownGracefully();
  });
