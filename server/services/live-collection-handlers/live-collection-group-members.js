'use strict';

var Promise = require('bluebird');
var appEvents = require('gitter-web-appevents');
var restSerializer = require('../../serializers/rest-serializer');
var debug = require('debug')('gitter:app:live-collection-group-members');
var _ = require('lodash');

module.exports = {
  added: function(groupId, userIds) {
    debug('Group %s: %s members added', groupId, userIds.length);

    var singleUserId = userIds.length === 1 && userIds[0];

    // TODO: custom serializations per user
    return restSerializer
      .serializeObject(groupId, new restSerializer.GroupIdStrategy({ currentUserId: singleUserId }))
      .then(function(serializedGroup) {
        _.forEach(userIds, function(userId) {
          var userUrl = '/user/' + userId + '/groups';
          appEvents.dataChange2(userUrl, 'create', serializedGroup, 'group');
        });
      });
  },

  removed: function(groupId, userIds) {
    _.forEach(userIds, function(userId) {
      appEvents.dataChange2('/user/' + userId + '/groups', 'remove', { id: groupId }, 'group');
    });

    return Promise.resolve();
  }
};
