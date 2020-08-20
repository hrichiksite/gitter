#!/usr/bin/env node

'use strict';

var shutdown = require('shutdown');
var uriLookupService = require('gitter-web-uri-resolver/lib/uri-lookup-service');
var roomService = require('gitter-web-rooms');
var troupeService = require('gitter-web-rooms/lib/troupe-service');

var readline = require('readline');
var Promise = require('bluebird');

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('from', {
    alias: 'f',
    required: true,
    description: 'Old uri for the room'
  })
  .option('to', {
    alias: 't',
    required: true,
    description: 'New uri for the room'
  })
  .help('help')
  .alias('help', 'h').argv;

var fromRoomInput = opts.from;
var toRoomInput = opts.to;

function confirm() {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(function(resolve, reject) {
    rl.question(
      'Are you sure you want to perform these redirects? ' +
        fromRoomInput +
        ' -> ' +
        toRoomInput +
        '\nType "yes"?',
      function(answer) {
        rl.close();

        if (answer === 'yes') return resolve();
        reject(new Error('no'));
      }
    );
  });
}

var getMessageFromRoomResult = function(roomName, test) {
  if (!test) {
    return roomName + ' does not exist.';
  }

  return '';
};

Promise.all([troupeService.findByUri(fromRoomInput), troupeService.findByUri(toRoomInput)])
  .spread(function(fromRoom, toRoom) {
    //console.log('asdf', fromRoom, toRoom);
    if (!fromRoom || !toRoom) {
      throw new Error(
        getMessageFromRoomResult(fromRoomInput, fromRoom) +
          ' ' +
          getMessageFromRoomResult(toRoomInput, toRoom)
      );
    }

    return confirm()
      .then(function() {
        // Signify the redirect
        toRoom.renamedLcUris.addToSet(fromRoom.lcUri);

        // Move any `renamedLcUris` from the fromRoom to the toRoom
        // Note: This probably doesn't apply to many situations
        [].concat(fromRoom.renamedLcUris).forEach(function(renamedLcUri) {
          toRoom.renamedLcUris.addToSet(renamedLcUri);
        });
        return toRoom.save();
      })
      .then(function() {
        return uriLookupService.removeBadUri(fromRoom.lcUri);
      })
      .then(function() {
        return roomService.deleteRoom(fromRoom);
      });
  })
  .then(function() {
    console.log('DONE: Shutting down');
    shutdown.shutdownGracefully();
  })
  .done();
