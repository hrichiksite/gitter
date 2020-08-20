'use strict';

const { getBackendForRoom } = require('gitter-web-shared/backend-utils');

function getHeaderLinkUrl(serializedTroupe) {
  const backend = getBackendForRoom(serializedTroupe);
  if (!backend) return;

  switch (backend.type) {
    case 'GL_GROUP':
    case 'GL_PROJECT':
    case 'GL_USER':
      return 'https://gitlab.com/' + backend.linkPath;
    case 'GH_REPO':
    case 'GH_ORG':
    case 'GH_USER':
      return 'https://github.com/' + backend.linkPath;
  }

  return;
}

function isTroupeAdmin(serializedTroupe) {
  return serializedTroupe.permissions && serializedTroupe.permissions.admin;
}

function getHeaderViewOptions(serializedTroupe) {
  var group = serializedTroupe.group;
  var groupUri = group && group.uri;
  var groupPageUrl = groupUri && '/orgs/' + groupUri + '/rooms';

  return {
    url: serializedTroupe.url,
    oneToOne: serializedTroupe.oneToOne,
    troupeName: serializedTroupe.name,
    favourite: serializedTroupe.favourite,
    premium: serializedTroupe.premium,
    isPrivate: !serializedTroupe.public,
    troupeTopic: serializedTroupe.topic,
    isAdmin: isTroupeAdmin(serializedTroupe),
    avatarUrl: serializedTroupe.avatarUrl,
    group: group,
    groupPageUrl: groupPageUrl,
    headerLink: getHeaderLinkUrl(serializedTroupe)
  };
}

module.exports = getHeaderViewOptions;
