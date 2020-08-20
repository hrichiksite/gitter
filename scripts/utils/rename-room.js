#!/usr/bin/env node

'use strict';

var shutdown = require('shutdown');
var uriLookupService = require('gitter-web-uri-resolver/lib/uri-lookup-service');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var groupService = require('gitter-web-groups/lib/group-service');

var readline = require('readline');
var Promise = require('bluebird');

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('old', {
    alias: 'o',
    required: true,
    description: 'Old uri for the room'
  })
  .option('new', {
    alias: 'n',
    required: true,
    description: 'New uri for the room'
  })
  .option('force', {
    alias: 'f',
    type: 'boolean',
    description: 'Performing changes that caused warnings before'
  })
  .help('help')
  .alias('help', 'h').argv;

var oldUri = opts.old;
var newUri = opts.new;

var lcOld = oldUri.toLowerCase();
var lcNew = newUri.toLowerCase();
var lcNewGroup = lcNew.split(/\//)[0];

function confirm() {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(function(resolve, reject) {
    rl.question(
      "Use this with caution! Are you sure you want to perform these renames? Type 'yes'? ",
      function(answer) {
        rl.close();

        if (answer === 'yes') return resolve();
        reject(new Error('no'));
      }
    );
  });
}

Promise.join(
  troupeService.findByUri(lcOld),
  troupeService.findByUri(lcNew),
  groupService.findByUri(lcNewGroup),
  function(room, clashRoom, newGroup) {
    if (clashRoom) {
      throw new Error('URI Clash: ' + lcNew);
    }
    if (!room) {
      throw new Error('Room does not exist: ' + lcOld);
    }
    if (!newGroup) {
      throw new Error('Attempt to move the room into non-existent group: ' + lcNewGroup);
    }
    if (lcNew === lcNewGroup) {
      throw new Error('Trying to rename room to a group: ' + lcNewGroup);
    }
    if (room.githubType === 'REPO' && !opts.force) {
      throw new Error(`
        WARNING: This repository is associated to a GitHub repository,
        please check that the new name reflects the new GitHub repository name.
        You can force this change with -f option.
      `);
    }

    console.log('BEFORE', {
      uri: room.uri,
      lcUri: room.lcUri,
      groupId: room.groupId,
      renamedLcUris: room.renamedLcUris
    });

    room.uri = newUri;
    room.groupId = newGroup._id;
    room.lcUri = lcNew;

    /* Only add if it's not a case change */
    if (lcOld !== lcNew) {
      room.renamedLcUris.addToSet(lcOld);
    }

    console.log('AFTER', {
      uri: room.uri,
      lcUri: room.lcUri,
      groupId: room.groupId,
      renamedLcUris: room.renamedLcUris
    });

    return confirm().return(room);
  }
)
  .then(function(room) {
    console.log('Updating');

    return room
      .save()
      .then(function() {
        return uriLookupService.removeBadUri(lcOld);
      })
      .then(function() {
        return uriLookupService.reserveUriForTroupeId(room.id, lcNew);
      });
  })
  .delay(5000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .done();
