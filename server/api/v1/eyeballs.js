'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;

var presenceService = require('gitter-web-presence');
var bayeux = require('../../web/bayeux');

module.exports = function(req, res, next) {
  var socketId = req.body.socketId;
  var on = parseInt(req.body.on, 10);

  bayeux.clientExists(socketId, function(exists) {
    if (!exists) {
      stats.eventHF('eyeballs.failed');
      stats.eventHF('eyeballs.failed.invalid.socket');

      logger.warn('eyeball: socket ' + socketId + ' does not exist. ');
      return res.sendStatus(400);
    }

    presenceService.clientEyeballSignal(req.user.id, socketId, on, function(err) {
      if (err) {
        stats.eventHF('eyeballs.failed');

        if (err.invalidSocketId) {
          stats.eventHF('eyeballs.failed.invalid.presence');

          logger.warn(
            'eyeball: socket ' +
              socketId +
              ' exists in the faye engine, but not in the presence service.'
          );
          bayeux.destroyClient(socketId);

          return res.sendStatus(400);
        }

        return next(err);
      }

      res.format({
        text: function() {
          res.send('OK');
        },
        json: function() {
          res.send({ success: true });
        },
        html: function() {
          res.send('OK');
        }
      });
    });
  });
};
