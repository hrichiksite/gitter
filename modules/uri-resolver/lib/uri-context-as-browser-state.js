'use strict';

function uriContextAsBrowserState(uriContext) {
  if (uriContext.ownUrl) {
    return {
      uri: uriContext.uri,
      type: 'home'
    };
  }

  var troupe = uriContext.troupe;
  if (troupe) {
    return {
      uri: uriContext.uri,
      type: 'room',
      roomId: troupe.id
    };
  }

  var group = uriContext.group;
  if (uriContext.group) {
    return {
      uri: uriContext.uri,
      type: 'group',
      groupId: group.id
    };
  }
}

module.exports = uriContextAsBrowserState;
