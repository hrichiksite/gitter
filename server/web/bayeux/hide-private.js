'use strict';

module.exports = {
  outgoing: function(message, req, callback) {
    if (message.ext) {
      delete message.ext.password;
      delete message._private;
    }

    callback(message);
  }
};
