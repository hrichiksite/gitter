#!/usr/bin/env node
/*jslint node: true, unused:true */
'use strict';

var shutdown = require('shutdown');
var presenceService = require('gitter-web-presence');
var bayeux = require('../../server/web/bayeux');
var async = require('async');
var env = require('gitter-web-env');

env.installUncaughtExceptionHandler();

// env.domainWrap(function() {
var CliOutput = require('./cli-output');

var cliOutput = new CliOutput(
  {
    socketId: { width: 32 },
    bayeux: { width: 8 },
    userId: { width: 24 },
    troupeId: { width: 24 },
    eyeballs: { width: 8 },
    mobile: { width: 8 },
    createdTime: { width: 25 },
    clientType: { width: 10 }
  },
  {
    all: { flag: true }
  }
);

var opts = cliOutput.opts;

function checkEngineExistence(socketIds, callback) {
  async.parallel(
    socketIds.map(function(socketId) {
      return function(cb) {
        bayeux.clientExists(socketId, function(exists) {
          return cb(null, exists);
        });
      };
    }),
    10,
    function(err, existence) {
      if (err) return callback(err);

      var result = socketIds.reduce(function(result, socketId, index) {
        result[socketId] = existence[index];
        return result;
      }, {});

      return callback(null, result);
    }
  );
}

function die(err) {
  console.error(err);
  shutdown.shutdownGracefully(1);
}
cliOutput.headers();

if (opts.all) {
  presenceService.listActiveSockets(function(err, sockets) {
    if (err) return die(err);

    var socketIds = sockets.map(function(socketInfo) {
      return socketInfo.id;
    });
    checkEngineExistence(socketIds, function(err, clientExists) {
      if (err) return die(err);
      sockets.forEach(function(socket) {
        cliOutput.row({
          socketId: socket.id,
          bayeux: clientExists[socket.id] ? 1 : 0,
          userId: socket.userId,
          troupeId: socket.troupeId,
          eyeballs: socket.eyeballs ? 1 : 0,
          mobile: socket.mobile ? 1 : 0,
          createdTime: socket.createdTime && new Date(socket.createdTime).toISOString(),
          clientType: socket.clientType
        });
      });

      shutdown.shutdownGracefully();
    });
  });
} else if (opts._.length === 0) {
  shutdown.shutdownGracefully();
} else {
  async.parallel(
    [
      function(cb) {
        checkEngineExistence(opts._, cb);
      },
      function(cb) {
        presenceService.getSockets(opts._, cb);
      }
    ],
    function(err, results) {
      if (err) return die(err);

      var clientExists = results[0];
      var sockets = results[1];

      opts._.forEach(function(socketId) {
        var socketInfo = sockets[socketId];

        cliOutput.row({
          socketId: socketId,
          bayeux: clientExists[socketId] ? 1 : 0,
          userId: socketInfo && socketInfo.userId,
          troupeId: socketInfo && socketInfo.troupeId,
          eyeballs: socketInfo && (socketInfo.eyeballs ? 1 : 0),
          mobile: socketInfo && (socketInfo.mobile ? 1 : 0),
          createdTime: socketInfo && socketInfo.createdTime.toISOString(),
          clientType: socketInfo && socketInfo.clientType
        });
      });

      return shutdown.shutdownGracefully();
    }
  );
}

// });
