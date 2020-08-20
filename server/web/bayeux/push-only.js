'use strict';

var bayeuxExtension = require('./extension');
var StatusError = require('statuserror');

module.exports = bayeuxExtension({
  name: 'pushOnly',
  skipSuperClient: true,
  incoming: function(message, req, callback) {
    if (message.channel === '/api/v1/ping2' || message.channel.match(/^\/meta\//)) {
      return callback();
    }

    return callback(new StatusError(403, 'Push access denied'));
  }
});
