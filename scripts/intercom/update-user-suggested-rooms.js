#!/usr/bin/env node
'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var shutdown = require('shutdown');
var userService = require('gitter-web-users');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var suggestionsService = require('../../server/services/suggestions-service');
var userSettingsService = require('gitter-web-user-settings');
var restSerializer = require('../../server/serializers/rest-serializer');
var intercom = require('gitter-web-intercom');
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');

var opts = require('yargs')
  .option('id', {
    required: false,
    description: 'mongo user id'
  })
  .option('username', {
    required: false,
    string: true
  })
  .option('email', {
    required: false
  })
  .help('help')
  .alias('help', 'h').argv;

if (!opts.id && !opts.username && !opts.email) {
  throw new Error('id, username or email required.');
}

function getUserFromMongo(opts) {
  if (opts.id) {
    return userService.findById(opts.id);
  }
  if (opts.username) {
    return userService.findByUsername(opts.username);
  }
  if (opts.email) {
    return userService.findByEmail(opts.email);
  }
}

function getRoomsForUserId(userId) {
  return roomMembershipService.findRoomIdsForUser(userId).then(function(roomIds) {
    // NOTE: we'll only need id, lang and oneToOne in normal operation in
    // order to get the suggestions. The rest is just for debugging.
    return troupeService.findByIdsLean(roomIds, {
      uri: 1,
      lcOwner: 1,
      lang: 1,
      name: 1,
      userCount: 1,
      oneToOne: 1
    });
  });
}

var user;
getUserFromMongo(opts)
  .then(function(_user) {
    user = _user;
    return Promise.all([
      getRoomsForUserId(user.id),
      userSettingsService.getUserSettings(user.id, 'lang')
    ]);
  })
  .spread(function(existingRooms, language) {
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
    // we use big avatars in the emails
    suggestions.forEach(function(room) {
      room.avatarUrl = resolveRoomAvatarUrl(room, 160);
    });

    //console.log(user);
    // email (and user_id?) should be enough to uniquely identify the user.
    // Create against an existing user acts as an update.
    // All fields that you're not changing remain set as is.
    console.log(_.pluck(suggestions, 'uri'));
    var profile = {
      email: user.email,
      user_id: user._id,
      custom_attributes: intercom.suggestionsToAttributes(suggestions)
    };
    //console.log(profile);
    return intercom.client.users.create(profile);
  })
  .then(function(intercomUser) {
    console.log(intercomUser.body);
  })
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    shutdown.shutdownGracefully(1);
  });
