#!/usr/bin/env node
'use strict';

var yargs = require('yargs');
var shutdown = require('shutdown');
var troupeService = require('gitter-web-rooms/lib/troupe-service');

var opts = yargs
  .option('uri', {
    required: true,
    type: 'string',
    description: 'uri of the room'
  })
  .option('set', {
    type: 'array',
    description: 'providers to set'
  })
  .option('unset', {
    type: 'boolean',
    description: 'clear out the providers'
  })
  .help('help')
  .alias('help', 'h').argv;

function run() {
  return troupeService.findByUri(opts.uri).then(function(troupe) {
    if (opts.set) {
      console.log('setting providers on', troupe.uri, 'to', opts.set);
      troupe.providers = opts.set;
    } else if (opts.unset) {
      console.log('clearing providers on', troupe.uri);
      troupe.providers = undefined;
    } else {
      console.log('Required: either set or unset');
    }
    return troupe.save();
  });
}

run()
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    shutdown.shutdownGracefully(1);
  });
