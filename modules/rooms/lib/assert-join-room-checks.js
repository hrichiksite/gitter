'use strict';

var assertUserValidInRoom = require('./assert-user-valid-in-room');
var assert = require('assert');

module.exports = function(room, existingUser) {
  assert(room, 'Room expected');

  // This made a lot more sense when there were multiple join room checks
  return assertUserValidInRoom(room, existingUser);
};
