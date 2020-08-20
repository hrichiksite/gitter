'use strict';

/* For development only */

/* Configure winston before all else! */
var env = require('gitter-web-env');
var winston = env.logger;

winston.info('Starting server/static.js');

var express = require('express');
var http = require('http');
var cors = require('cors');
var app = express();

var server = http.createServer(app);

// Sanity check whether the server is up and running so it doesn't fail silently
setTimeout(() => {
  if (!server.listening) {
    winston.info('Static server failed to startup after 5 seconds, ' + server.listening);
  }
}, 5000);

// API uses CORS
var corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  maxAge: 600, // 10 minutes
  allowedHeaders: ['content-type', 'x-access-token', 'authorization', 'accept'],
  exposedHeaders: [
    // Rate limiting with dolph
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

require('./web/express-static').install(app);

var port = process.env.PORT || 5001;

server.listen(port, function(err) {
  if (err) {
    winston.error('An error occurred during static server startup: ' + err, { exception: err });
  }

  winston.info('Listening on ' + port);
});
