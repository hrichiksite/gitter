'use strict';

var bayeuxExtension = require('./extension');
var StatusError = require('statuserror');
var presenceService = require('gitter-web-presence');

module.exports = function(server) {
  return bayeuxExtension({
    channel: '/meta/connect',
    name: 'doorman',
    failureStat: 'bayeux.connect.deny',
    skipSuperClient: true,
    skipOnError: true,
    incoming: function(message, req, callback) {
      var clientId = message.clientId;

      server._server._engine.clientExists(clientId, function(exists) {
        if (!exists) return callback(new StatusError(401, 'Client does not exist'));

        presenceService.socketExists(clientId, function(err, exists) {
          if (err) return callback(err);

          if (!exists) return callback(new StatusError(401, 'Socket association does not exist'));

          return callback(null, message);
        });
      });
    }
  });
};
