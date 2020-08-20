'use strict';

// Accepts a serialized room or backbone model for a room
function getBackendForRoom(room) {
  let backend = (room.get && room.get('backend')) || room.backend;
  // When the room security descriptor is referencing the group, use that security descriptor instead
  if (backend && backend.type === 'GROUP') {
    const group = (room.get && room.get('group')) || room.group;
    backend = group.backedBy;
  }

  return backend;
}

function getLinkPathCond(type, object) {
  var backend = (object.get && object.get('backend')) || object.backend;
  if (!backend) return;
  if (backend.type === type) return backend.linkPath;
}

module.exports = {
  getBackendForRoom,
  getLinkPathCond
};
