'use strict';

var appEvents = require('gitter-web-appevents');
var _ = require('lodash');

module.exports = {
  patch: function(userId, groupId, patchData) {
    var patchMessage = _.extend({}, patchData, {
      id: groupId
    });

    appEvents.dataChange2('/user/' + userId + '/groups', 'patch', patchMessage, 'group');
  }
};
