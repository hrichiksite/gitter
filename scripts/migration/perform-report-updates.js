#!/usr/bin/env node
'use strict' /* messy messy @lerouxb */;

/* eslint-disable */ var fs = require('fs');
var _ = require('lodash');
var Promise = require('bluebird');
var shutdown = require('shutdown');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var userService = require('gitter-web-users');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var uriLookupService = require('gitter-web-uri-resolver/lib/uri-lookup-service');

function renameUser(update) {
  console.log('USER', update.oldUsername, update.newUsername);

  var promises = [];

  promises.push(
    // update the user itself
    userService.findById(update.gitterUserId).then(function(user) {
      // if user is null, then that's a pretty bad error anyway
      user.username = update.newUsername;
      return user.save();
    })
  );

  var lcMatches = update.oldUsername.toLowerCase() === update.newUsername.toLowerCase();
  if (!lcMatches) {
    // also update the uri lookup
    promises.push(uriLookupService.removeBadUri(update.oldUsername));
    promises.push(uriLookupService.reserveUriForUsername(update.gitterUserId, update.newUsername));
  }

  return Promise.all(promises);
}

function renameRoom(update) {
  console.log('ROOM', update.oldUri, update.newUri);
  var promises = [];

  var lcMatches = update.oldUri.toLowerCase() === update.newLcUri;

  promises.push(
    // update the room uri
    troupeService.findById(update.roomId).then(function(room) {
      // if room is null, then that's a pretty bad error anyway
      room.uri = update.newUri;
      room.lcUri = update.newLcUri;
      room.lcOwner = update.newLcUri.split('/')[0];

      if (!lcMatches) {
        // also add a redirect if the uri changed in more than just case
        room.renamedLcUris.addToSet(update.oldUri.toLowerCase());
      }

      return room.save();
    })
  );

  if (!lcMatches) {
    // also update the uri lookup
    promises.push(uriLookupService.removeBadUri(update.oldUri));
    promises.push(uriLookupService.reserveUriForTroupeId(update.roomId, update.newUri));
  }

  return Promise.all(promises);
}

var performUpdate = Promise.method(function(update, duplicates) {
  if (update.type === 'rename-user') {
    if (duplicates.usernames[update.newUsername]) {
      console.log('SKIPPING USER', update.oldUsername);
    } else {
      return renameUser(update);
    }
  }
  if (update.type === 'rename-room') {
    if (duplicates.lcUris[update.newLcUri]) {
      console.log('SKIPPING ROOM', update.oldUri);
    } else {
      return renameRoom(update);
    }
  }
});

// asynchronously perform database updates and return a promise
function performUpdates(updates, duplicates) {
  return Promise.map(
    updates,
    function(update) {
      return performUpdate(update, duplicates);
    },
    { concurrency: 3 }
  );
}

function lookupUsername(username) {
  // case-insensitive just in case
  var lcUsername = username.toLowerCase();
  var regex = new RegExp(['^', lcUsername, '$'].join(''), 'i');
  return userService.findByUsername(regex);
}

function lookupRoomUris(uri) {
  return troupeService.findByUri(uri);
}

function findDuplicates(updates) {
  // It is better to just reason about and fix anything that will clash
  // manually.

  var duplicateUsernames = {};
  var duplicateLcUris = {};

  var newUsernameMap = {};
  var newLcUriMap = {};
  var renamedLcUsernameMap = {};
  var renamedLcUriMap = {};
  updates.forEach(function(update) {
    if (update.type === 'rename-user') {
      if (update.newUsername.toLowerCase() !== update.oldUsername.toLowerCase()) {
        // the username changed in more than just case
        renamedLcUsernameMap[update.newUsername.toLowerCase()] = true;
      }

      if (newUsernameMap[update.newUsername]) {
        duplicateUsernames[update.newUsername] = true;
        console.log('duplicate username', update.newUsername);
      } else {
        newUsernameMap[update.newUsername] = true;
      }
    } else if (update.type === 'rename-room') {
      if (update.newLcUri !== update.oldUri.toLowerCase()) {
        // the room changed in more than just case
        renamedLcUriMap[update.newLcUri] = true;
      }

      if (newLcUriMap[update.newLcUri]) {
        duplicateLcUris[update.newLcUri] = true;
        console.log('duplicate lcUri', update.newLcUri);
      } else {
        newLcUriMap[update.newLcUri] = true;
      }
    }
  });

  // these will only be looking up usernames and uris that changed in more than
  // case, otherwise we'll just find the same users and rooms..
  var usernames = Object.keys(renamedLcUsernameMap);
  var lcUris = Object.keys(renamedLcUriMap);
  console.log('looking up', usernames.length, 'usernames');
  console.log('looking up', lcUris.length, 'uris');
  return Promise.join(
    Promise.map(usernames, lookupUsername, { concurrency: 10 }),
    Promise.map(lcUris, lookupRoomUris, { concurrency: 10 }),
    function(users, rooms) {
      users = _.filter(users);
      rooms = _.filter(rooms);
      users.forEach(function(user) {
        // if there's already a username like this, then it is a duplicate
        duplicateUsernames[user.username] = true;
        console.log('duplicate username', user.username);
      });
      rooms.forEach(function(room) {
        // if there is already a room uri like this, then it is a duplicate
        duplicateLcUris[room.lcUri] = true;
        console.log('duplicate room', room.uri);
      });

      return {
        usernames: duplicateUsernames,
        lcUris: duplicateLcUris
      };
    }
  );
}

var opts = require('yargs')
  .option('input', {
    required: true,
    description: 'where to find the json report'
  })
  .help('help')
  .alias('help', 'h').argv;

onMongoConnect()
  .then(function() {
    var text = fs.readFileSync(opts.input);
    var json = JSON.parse(text);
    return findDuplicates(json.updates).then(function(duplicates) {
      console.log('-------------------------');
      return performUpdates(json.updates, duplicates);
    });
  })
  .then(function() {
    setTimeout(function() {
      shutdown.shutdownGracefully();
    }, 1000);
  })
  .catch(function(error) {
    console.error(error);
    console.error(error.stack);
    process.exit(1);
  });
