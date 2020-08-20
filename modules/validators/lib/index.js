'use strict';

module.exports = {
  reservedNamespaces: require('./reserved-namespaces'),
  reservedSubNamespaces: require('./reserved-sub-namespaces'),
  validateDisplayName: require('./validate-display-name'),
  validateGroupName: require('./validate-group-name'),
  validateGroupUri: require('./validate-group-uri'),
  validateMarkdown: require('./validate-markdown'),
  validateProviders: require('./validate-providers'),
  validateRoomName: require('./validate-room-name'),
  validateSlug: require('./validate-slug'),
  validateTags: require('./validate-tags'),
  validateUsername: require('./validate-username'),
  validateSticky: require('./validate-sticky'),
  validateAdminOnly: require('./validate-admin-only')
};
