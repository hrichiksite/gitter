'use strict';

require('./utils/diagnostics');

/* Configure winston before all else! */
const env = require('gitter-web-env');
const winston = env.logger;
var nconf = env.config;
var express = require('express');
var http = require('http');
var serverStats = require('./utils/server-stats');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');

var app = express();

var server = http.createServer(app);

require('./web/graceful-shutdown').install(server, app);

require('./web/express').installApi(app);

require('./web/passport').installApi();

require('./event-listeners').install();

require('./workers').listen();

app.use('/', require('./api/'));

if (!process.env.DISABLE_API_ERROR_HANDLER) {
  app.use(env.middlewares.errorHandler);
}

if (!process.env.DISABLE_API_LISTEN) {
  onMongoConnect(function() {
    serverStats('api', server);

    var port = nconf.get('PORT');
    server.listen(port, undefined, nconf.get('web:backlog'), function() {
      winston.info('Listening on ' + port);
    });
  });
}

module.exports = server;
