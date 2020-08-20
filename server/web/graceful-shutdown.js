'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var shutdown = require('shutdown');

module.exports = {
  install: function(server, app) {
    var gracefullyClosing = false;
    app.use(function(req, res, next) {
      if (!gracefullyClosing) return next();

      res.setHeader('Connection', 'close');
      res.status(502).send('Server is in the process of restarting');
    });

    shutdown.addHandler('web', 20, function(callback) {
      gracefullyClosing = true;
      var start = Date.now();
      server.close(function() {
        var time = Date.now() - start;
        logger.info('Web server shutdown successfully in ' + time + 'ms');
        callback();
      });
    });
  }
};
