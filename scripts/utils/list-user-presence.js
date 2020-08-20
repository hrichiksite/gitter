#!/usr/bin/env node
/*jslint node:true, unused:true */
'use strict';

var userService = require('gitter-web-users');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var collections = require('gitter-web-utils/lib/collections');
var presence = require('gitter-web-presence');
var _ = require('lodash');

var shutdown = require('shutdown');

var opts = require('yargs')
  .option('username', {
    required: true,
    description: 'username of user to list presence for',
    string: true
  })
  .help('help')
  .alias('help', 'h').argv;

var sockets;
userService
  .findByUsername(opts.username)
  .then(function(user) {
    return presence.listAllSocketsForUser(user.id);
  })
  .then(function(socketIds) {
    return presence.getSockets(socketIds);
  })
  .then(function(_sockets) {
    //console.log(_sockets);
    sockets = _.sortBy(_.values(_sockets), 'createdTime');
    var troupeIds = _.pluck(sockets, 'troupeId');
    return troupeService.findByIdsLean(troupeIds, { uri: 1 });
  })
  .then(function(troupes) {
    // just modify it in place
    var troupeHash = collections.indexById(troupes);
    sockets.forEach(function(socket) {
      if (troupeHash[socket.troupeId]) {
        socket.troupe = troupeHash[socket.troupeId].uri;
      }
      // this is all the same anyway
      delete socket.userId;
    });
    console.log(sockets);
    /*
    console.log(_.countBy(sockets, function(socket) {
      // isostring seems to contain milliseconds
      return socket.createdTime.toISOString();
    }));
    */
    console.log('Total:', sockets.length);
  })
  .catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
