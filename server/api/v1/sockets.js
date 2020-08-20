'use strict';

var presenceService = require('gitter-web-presence');

module.exports = function(req, res, next) {
  var socketId = String(req.params.socketId);
  var userId = req.user && req.user.id;

  presenceService.socketDisconnectionRequested(userId, socketId, function(err) {
    if (err) {
      if (err.invalidSocketId) {
        return res.sendStatus(400);
      }

      return next(err);
    }

    res.send('OK');
  });
};
