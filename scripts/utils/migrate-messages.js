#!/usr/bin/env node
/*jslint node: true */
'use strict';

var troupeService = require('gitter-web-rooms/lib/troupe-service');
var persistence = require('gitter-web-persistence');
var Promise = require('bluebird');
var assert = require('assert');
var shutdown = require('shutdown');

var opts = require('yargs')
  .option('from', {
    alias: 'f',
    required: true,
    description: 'Room to take messages from'
  })
  .option('to', {
    alias: 't',
    required: true,
    description: 'Room to migrate messages to'
  })
  .help('help')
  .alias('help', 'h').argv;

Promise.all([troupeService.findByUri(opts.from), troupeService.findByUri(opts.to)])
  .spread(function(fromRoom, toRoom) {
    assert(fromRoom && fromRoom.id, 'lookup failed for ' + opts.from);
    assert(toRoom && fromRoom.id, 'lookup failed for ' + opts.to);

    return persistence.ChatMessage.update(
      { toTroupeId: fromRoom.id },
      { $set: { toTroupeId: toRoom.id } },
      { multi: true }
    ).exec();
  })
  .delay(5000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error('Error: ' + err, err);
    shutdown.shutdownGracefully(1);
  })
  .done();
