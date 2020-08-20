#!/usr/bin/env node
/*jslint node:true, unused:true */
'use strict';

var env = require('gitter-web-env');
var config = env.config;
var presence = require('gitter-web-presence');
var _ = require('lodash');

var shutdown = require('shutdown');

function createClient() {
  return env.ioredis.createClient(null, {
    keyPrefix: config.get('presence:prefix') + ':'
  });
}

var redisClient = createClient();

var now = new Date();

var oldSockets = [];

// really not sure what would be the best count
var stream = redisClient.sscanStream('activesockets', { count: 1000 });

stream.on('data', function(socketIds) {
  //console.log(socketIds);
  presence.getSockets(socketIds).then(function(_sockets) {
    var sockets = _.values(_sockets);
    sockets.forEach(function(socket) {
      if (!socket) return;
      socket.days = (now - socket.createdTime) / (1000 * 60 * 60 * 24);
      if (socket.days > 7) {
        //console.log(socket);
        oldSockets.push(socket);
      }
    });
  });
});

stream.on('end', function() {
  var socketsbyAge = _.sortBy(oldSockets, 'days');
  socketsbyAge.reverse();
  console.log(socketsbyAge.slice(0, 100));
  shutdown.shutdownGracefully();
});
