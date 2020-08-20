'use strict';

module.exports = function getMostRecentRooms(size, rooms) {
  var filtered = rooms.filter(function(room) {
    return room.id && room.lastAccess;
  });

  filtered.sort(function(a, b) {
    // Reverse sort
    return b.lastAccess - a.lastAccess;
  });

  return filtered.slice(0, size);
};
