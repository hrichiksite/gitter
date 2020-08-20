'use strict';

const userService = require('gitter-web-users');
const groupService = require('gitter-web-groups');
const roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
const adminFilter = require('gitter-web-permissions/lib/known-external-access/admin-filter');

// Looks through all room members in the group and finds any group admin
//
// You may also be interested in
//    - require('gitter-web-permissions/lib/admin-discovery').findModelsForGithubOrgAdmin
//    - require('gitter-web-permissions/lib/admin-discovery').findModelsForExtraAdmin
function findGroupAdminUsers(group) {
  return groupService
    .findRoomsInGroup(group.id)
    .then(rooms => {
      if (!rooms || rooms.length === 0) {
        return {};
      }

      const roomIds = rooms.map(room => room.id);
      console.log(`Looking at ${rooms.length} rooms`);

      return roomMembershipService.findMembersForRoomMulti(roomIds);
    })
    .then(userMap => {
      return Object.keys(userMap).reduce((users, userMapKey) => {
        return users.concat(userMap[userMapKey]);
      }, []);
    })
    .then(userIds => {
      const uniqueUserMap = userIds.reduce((uniqueMap, userId) => {
        uniqueMap[userId] = true;
        return uniqueMap;
      }, {});

      return Object.keys(uniqueUserMap);
    })
    .then(userIds => {
      console.log(`Looking at ${userIds.length} users`);

      return adminFilter(group, userIds);
    })
    .then(adminUserIds => {
      return userService.findByIdsLean(adminUserIds);
    })
    .then(adminUsers => {
      console.log(`Looking at ${adminUsers.length} admin users`);

      adminUsers.forEach(adminUser => {
        console.log(`${adminUser.id}: ${adminUser.username}`);
      });

      return adminUsers;
    });
}

module.exports = findGroupAdminUsers;
