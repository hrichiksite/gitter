#!/usr/bin/env node
/*jslint node: true */
'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var presenceService = require('gitter-web-presence');
var shutdown = require('shutdown');

var BayeuxCluster = require('../../server/web/bayeux/cluster');
var bayeux = new BayeuxCluster(true); // Lightweight bayeux cluster

presenceService.collectGarbage(bayeux, function(err) {
  if (err) winston.error('Error while validating sockets' + err, { exception: err });

  shutdown.shutdownGracefully();
});
