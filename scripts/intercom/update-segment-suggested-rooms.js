#!/usr/bin/env node
'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var config = env.config;
var Promise = require('bluebird');
var _ = require('lodash');
var shutdown = require('shutdown');
var through2Concurrent = require('through2-concurrent');
var userService = require('gitter-web-users');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var suggestionsService = require('../../server/services/suggestions-service');
var userSettingsService = require('gitter-web-user-settings');
var restSerializer = require('../../server/serializers/rest-serializer');
var intercom = require('gitter-web-intercom');
var getIntercomStream = require('intercom-stream');

var opts = require('yargs')
  .option('segment', {
    alias: 's',
    description: 'Id of the segment to list'
  })
  .help('help')
  .alias('help', 'h').argv;

if (!opts.segment) {
  // this just makes running the production (or beta) script much easier
  var defaultSegment = config.get('stats:intercom:suggestedRoomSegmentId');
  if (defaultSegment) {
    console.log('Using default segment', defaultSegment);
    opts.segment = defaultSegment;
  } else {
    throw new Error('Segment required.');
  }
}

var stream = getIntercomStream({ client: intercom.client, key: 'users' }, function() {
  return intercom.client.users.listBy({ segment_id: opts.segment });
});

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

stream
  .pipe(
    through2Concurrent.obj({ maxConcurrency: 10 }, function(intercomUser, enc, callback) {
      var userId = intercomUser.user_id;
      var username = intercomUser.custom_attributes.username;
      var email = intercomUser.email;
      console.log('Starting ' + username);

      var promises = [
        userService.findById(userId),
        getRoomsForUserId(userId),
        userSettingsService.getUserSettings(userId, 'lang')
      ];
      Promise.all(promises)
        .spread(function(user, rooms, language) {
          return suggestionsService.findSuggestionsForRooms({
            user: user,
            rooms: rooms,
            language: language
          });
        })
        .then(function(suggestedRooms) {
          var strategy = restSerializer.TroupeStrategy.createSuggestionStrategy();
          return restSerializer.serialize(suggestedRooms, strategy);
        })
        .then(function(suggestions) {
          var suggestionsString = _.pluck(suggestions, 'uri').join(', ');
          console.log('Suggestions for', username + ':', suggestionsString);

          suggestions.forEach(function(room) {
            stats.event('suggest_room', {
              userId: userId,
              username: username,
              roomId: room._id,
              roomUri: room.uri
            });
          });

          var profile = {
            email: email,
            user_id: userId,
            custom_attributes: intercom.suggestionsToAttributes(suggestions)
          };

          return intercom.client.users.create(profile);
        })
        .then(function() {
          console.log('Done with', username);
        })
        //.nodeify(callback);
        .then(function() {
          callback();
        })
        .catch(function(err) {
          console.error(err);
          console.error(err.stack);
          callback(err);
        });
    })
  )
  .on('data', function() {})
  .on('end', function() {
    console.log('done');
    shutdown.shutdownGracefully();
  })
  .on('error', function die(error) {
    console.error(error);
    console.error(error.stack);
    shutdown.shutdownGracefully();
  });
