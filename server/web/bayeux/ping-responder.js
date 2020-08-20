'use strict';

var bayeuxExtension = require('./extension');
var StatusError = require('statuserror');
var presenceService = require('gitter-web-presence');

module.exports = function(server) {
  return bayeuxExtension({
    channel: '/api/v1/ping2',
    name: 'pingResponder',
    failureStat: 'bayeux.ping.deny',
    incoming: function(message, req, callback) {
      // Remember we've got the ping reason if we need it
      //var reason = message.data && message.data.reason;

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
