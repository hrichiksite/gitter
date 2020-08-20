#!/usr/bin/env node
'use strict';

var yargs = require('yargs');
var shutdown = require('shutdown');
var userService = require('gitter-web-users');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var restSerializer = require('../../server/serializers/rest-serializer');
var suggestionsService = require('../../server/services/suggestions-service');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var userSettingsService = require('gitter-web-user-settings');
var shimPositionOption = require('../yargs-shim-position-option');
var Promise = require('bluebird');

var argv = yargs.argv;
var opts = yargs
  .option(
    'username',
    shimPositionOption({
      position: 0,
      required: !argv.uri,
      description: 'username to look up e.g trevorah',
      string: true
    })
  )
  .option('uri', {
    type: 'array',
    required: !argv.username,
    description: 'room(s) in which to do the lookup'
  })
  .option('language', {
    required: !!argv.uri,
    description: 'human language (only required & used when not specifying a username)'
  })
  .help('help')
  .alias('help', 'h').argv;

function lookupByRooms() {
  return Promise.all(
    opts.uri.map(function(uri) {
      return troupeService.findByUri(uri);
    })
  )
    .then(function(rooms) {
      return suggestionsService.findSuggestionsForRooms({
        rooms: rooms,
        language: opts.language
      });
    })
    .then(function(suggestedRooms) {
      var strategy = restSerializer.TroupeStrategy.createSuggestionStrategy();
      return restSerializer.serialize(suggestedRooms, strategy);
    })
    .then(function(suggestions) {
      console.log(suggestions.length, 'results');
      suggestions.forEach(function(suggestion) {
        console.log(suggestion.uri, suggestion);
      });
    });
}

function run() {
  if (opts.uri) {
    return lookupByRooms();
  } else {
    return lookupByUsername();
  }
}

function lookupByUsername() {
  return userService
    .findByUsername(opts.username)
    .then(function(user) {
      return [
        user,
        roomMembershipService.findRoomIdsForUser(user.id).then(function(roomIds) {
          return troupeService.findByIdsLean(roomIds, {
            uri: 1,
            lcOwner: 1,
            lang: 1,
            oneToOne: 1
          });
        }),
        userSettingsService.getUserSettings(user.id, 'lang')
      ];
    })
    .spread(function(user, existingRooms, language) {
      return suggestionsService.findSuggestionsForRooms({
        user: user,
        rooms: existingRooms,
        language: language
      });
    })
    .then(function(suggestedRooms) {
      var strategy = restSerializer.TroupeStrategy.createSuggestionStrategy();
      return restSerializer.serialize(suggestedRooms, strategy);
    })
    .then(function(suggestions) {
      console.log(suggestions.length, 'results');
      suggestions.forEach(function(suggestion) {
        console.log(suggestion.uri, suggestion);
      });
    });
}

run()
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    process.exit(1);
    shutdown.shutdownGracefully(1);
  });
