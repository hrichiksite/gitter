'use strict';

var context = require('gitter-web-client-context');
var eyeballsDetector = require('./eyeballs-detector');
var track = false;

module.exports = {
  track: function() {
    if (track) return;
    track = true;
  },

  getAuthDetails: function() {
    if (!track) return {};

    return {
      troupeId: context.getTroupeId(),
      eyeballs: eyeballsDetector.getEyeballs() ? 1 : 0
    };
  },

  getEyeballs: function() {
    return track && eyeballsDetector.getEyeballs() ? 1 : 0;
  }
};
