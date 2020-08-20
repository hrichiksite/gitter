'use strict';

/**
 * Bridges events from the membership service up to the live-collections
 */

var env = require('gitter-web-env');
var stats = env.stats;
var errorReporter = env.errorReporter;
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var liveCollections = require('gitter-web-live-collection-events');
var unreadItemService = require('gitter-web-unread-items');
var _ = require('lodash');

function onMembersAdded(troupeId, userIds) {
  liveCollections.roomMembers.emit('added', troupeId, userIds);
}

function onMembersRemoved(troupeId, userIds) {
  liveCollections.roomMembers.emit('removed', troupeId, userIds);
}

function onMembersLurkChange(troupeId, userIds, lurk) {
  _.forEach(userIds, function(userId) {
    stats.event('lurk_room', {
      userId: '' + userId,
      troupeId: '' + troupeId,
      lurking: lurk
    });

    if (lurk) {
      unreadItemService
        .ensureAllItemsRead(userId, troupeId)
        .catch(function(err) {
          errorReporter(err, { unreadItemsFailed: true }, { module: 'room-membership-events' });
        })
        .done();
    }
  });

  liveCollections.roomMembers.emit('lurkChange', troupeId, userIds, lurk);
  return null;
}

function onGroupMembersAdded(groupId, userIds) {
  var groupIdString = String(groupId);

  _.forEach(userIds, function(userId) {
    stats.event('join_group', {
      userId: String(userId),
      groupId: groupIdString
    });
  });

  liveCollections.groupMembers.emit('added', groupId, userIds);
}

function onGroupMembersRemoved(groupId, userIds) {
  var groupIdString = String(groupId);

  _.forEach(userIds, function(userId) {
    stats.event('leave_group', {
      userId: String(userId),
      groupId: groupIdString
    });
  });

  liveCollections.groupMembers.emit('removed', groupId, userIds);
}

var installed = false;
exports.install = function() {
  if (installed) return;
  installed = true;

  var events = roomMembershipService.events;

  // Room Member changes
  events.on('members.added', onMembersAdded);
  events.on('members.removed', onMembersRemoved);
  events.on('members.lurk.change', onMembersLurkChange);

  // Group Member Changes
  events.on('group.members.added', onGroupMembersAdded);
  events.on('group.members.removed', onGroupMembersRemoved);
};

exports.testOnly = {
  onMembersAdded: onMembersAdded,
  onMembersRemoved: onMembersRemoved,
  onMembersLurkChange: onMembersLurkChange
};
