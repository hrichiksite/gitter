'use strict';

function isPublic(object) {
  // Note, this should deliberately crash when
  // object.sd is undefined
  return object.sd.public;
}

function getLinkPathIfType(type, object) {
  // Note, this should deliberately crash when
  // object.sd is undefined
  if (object.sd.type !== type) {
    return;
  }

  return object.sd.linkPath;
}

module.exports = {
  isPublic: isPublic,
  getLinkPathIfType: getLinkPathIfType
};
