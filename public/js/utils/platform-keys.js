'use strict';

var platformDetect = require('./platformDetect');

module.exports = (function() {
  // Set modifier keys for the OS

  switch (platformDetect()) {
    case 'Mac':
      return {
        cmd: '⌘',
        gitter: 'ctrl'
      };
    case 'Windows':
      return {
        cmd: 'ctrl',
        gitter: '⇧'
      };
    default:
      return {
        // Linux and other
        cmd: 'ctrl',
        gitter: '⇧+alt'
      };
  }
})();
