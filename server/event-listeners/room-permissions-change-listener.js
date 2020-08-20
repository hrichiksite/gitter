'use strict';

var appEvents = require('gitter-web-appevents');
var roomService = require('gitter-web-rooms');

var installed = false;
exports.install = function() {
  if (installed) return;
  installed = true;

  appEvents.onRepoPermissionsChangeDetected(function(data) {
    var uri = data.uri;
    var isPrivate = data.isPrivate;

    if (isPrivate) {
      roomService.ensureRepoRoomSecurity(uri, 'PRIVATE');
    } else {
      roomService.ensureRepoRoomSecurity(uri, 'PUBLIC');
    }
  });
};
