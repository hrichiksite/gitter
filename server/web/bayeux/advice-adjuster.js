'use strict';

var env = require('gitter-web-env');
var config = env.config;

module.exports = {
  outgoing: function(message, req, callback) {
    delete message._private;
    var error = message.error;

    if (error) {
      var errorCode = error.split(/::/)[0];
      if (errorCode) errorCode = parseInt(errorCode, 10);

      if (errorCode === 401) {
        var reconnect;
        var interval = config.get('ws:fayeRetry') * 1000;

        if (message.channel === '/meta/handshake') {
          // Handshake failing, go away
          reconnect = 'none';
          // They shouldn't try to reconnect at all but bugged clients might try
          // 10 days
          interval = 10 * 24 * 60 * 60 * 1000;
        } else {
          // Rehandshake
          reconnect = 'handshake';
        }

        if (!message.advice) message.advice = {};

        message.advice.reconnect = reconnect;
        message.advice.interval = interval;
      }
    }

    callback(message);
  }
};
