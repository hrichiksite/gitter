#!/usr/bin/env node
/*jslint node:true, unused:true */
'use strict';

var userService = require('gitter-web-users');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var oneToOneRoomService = require('gitter-web-rooms/lib/one-to-one-room-service');
var categoriseUsersInRoom = require('gitter-web-unread-items/lib/categorise-users-in-room');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var collections = require('gitter-web-utils/lib/collections');
var Promise = require('bluebird');

var shutdown = require('shutdown');

function pad(string, length) {
  if (!string) string = '';

  while (string.length < length) {
    string = string + ' ';
  }
  return string;
}
var opts = require('yargs')
  .option('uri', {
    description: 'uri of room to list presence for'
  })
  .option('fromUser', {
    description: 'id of room to list presence for'
  })
  .option('toUser', {
    description: 'id of room to list presence for'
  })
  .help('help')
  .alias('help', 'h').argv;

function getTroupe() {
  if (opts.uri) return troupeService.findByUri(opts.uri);

  if (!opts.fromUser || !opts.toUser) {
    return Promise.reject('Please specify either a uri or a fromUser and toUser');
  }

  return Promise.all([
    userService.findByUsername(opts.fromUser),
    userService.findByUsername(opts.toUser)
  ]).spread(function(fromUser, toUser) {
    if (!fromUser) throw new Error('User ' + opts.fromUser + ' not found');
    if (!toUser) throw new Error('User ' + opts.toUser + ' not found');

    return oneToOneRoomService.findOneToOneRoom(fromUser._id, toUser._id);
  });
}

getTroupe()
  .then(function(troupe) {
    if (!troupe) throw new Error('No room found');
    return [troupe, roomMembershipService.findMembersForRoom(troupe._id)];
  })
  .spread(function(troupe, userIds) {
    return categoriseUsersInRoom(troupe._id, userIds);
  })
  .then(function(result) {
    return [result, userService.findByIdsLean(Object.keys(result), { username: 1 })];
  })
  .spread(function(result, users) {
    var usersHash = collections.indexById(users);
    Object.keys(result).forEach(function(userId) {
      var user = usersHash[userId];
      console.log(pad(user && user.username, 30), ' ', result[userId]);
    });
  })
  .catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
