'use strict';

/**
 * NB NB NB: this must remain on the main app, and not on the api.gitter.im
 * In order to keep the session cookie alive
 */
module.exports = function(req, res) {
  res.format({
    text: function() {
      res.send('OK');
    },

    html: function() {
      res.send('OK');
    },

    json: function() {
      res.send({ success: true });
    }
  });
};
