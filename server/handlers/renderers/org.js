'use strict';

var assert = require('assert');
var clientEnv = require('gitter-client-env');
var Promise = require('bluebird');
var StatusError = require('statuserror');
const asyncHandler = require('express-async-handler');
var avatars = require('gitter-web-avatars');
var fonts = require('../../web/fonts');
var restSerializer = require('../../serializers/rest-serializer');

var contextGenerator = require('../../web/context-generator');
var generateRoomCardContext = require('gitter-web-shared/templates/partials/room-card-context-generator');
var userService = require('gitter-web-users');
var groupBrowserService = require('gitter-web-groups/lib/group-browser-service');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var generateUserThemeSnapshot = require('../snapshots/user-theme-snapshot');
const mixinHbsDataForVueLeftMenu = require('./vue/mixin-vue-left-menu-data');

var ROOMS_PER_PAGE = 15;

function findRooms(groupId, user, currentPage) {
  assert(ROOMS_PER_PAGE <= 15, 'Querying for more than 15 rooms can slow things down too much');
  var userId = user && user._id;

  var skip = (currentPage - 1) * ROOMS_PER_PAGE;
  if (skip > 2000) throw new StatusError(400);

  return groupBrowserService
    .findRoomsWithPagination(groupId, userId, {
      skip: skip,
      limit: ROOMS_PER_PAGE
    })
    .then(function(roomBrowseResult) {
      var strategy = restSerializer.TroupeStrategy.createSuggestionStrategy();

      return restSerializer
        .serialize(roomBrowseResult.results, strategy)
        .then(function(serializedRooms) {
          roomBrowseResult.results = serializedRooms;
          return roomBrowseResult;
        });
    });
}

function getRoomMembersForRooms(rooms) {
  var roomMembershipIdMap = {};
  var userIdMap = {};

  return Promise.all(
    rooms.map(function(room) {
      return roomMembershipService
        .findMembersForRoom(room.id, { limit: 5 })
        .then(function(userIds) {
          roomMembershipIdMap[room.id] = userIds;
          userIds.forEach(function(userId) {
            userIdMap[userId] = true;
          });
        });
    })
  )
    .then(function() {
      var userIds = Object.keys(userIdMap);
      return userService.findByIds(userIds).then(function(users) {
        return users.reduce(function(map, user) {
          map[user.id] = user;
          return map;
        }, {});
      });
    })
    .then(function(userMap) {
      return rooms.reduce(function(roomMembershipMap, room) {
        roomMembershipMap[room.id] = (roomMembershipIdMap[room.id] || []).reduce(function(
          membershipList,
          userId
        ) {
          const user = userMap[userId];
          if (user) {
            membershipList.push(user);
          }

          return membershipList;
        },
        []);
        return roomMembershipMap;
      }, {});
    });
}

function getRoomsWithMembership(groupId, user, currentPage) {
  return findRooms(groupId, user, currentPage).then(function(roomBrowseResult) {
    var rooms = roomBrowseResult.results;

    return getRoomMembersForRooms(rooms)
      .then(function(roomMembershipMap) {
        return rooms.map(function(room) {
          room.users = (roomMembershipMap[room.id] || []).map(function(user) {
            user.avatarUrl = avatars.getForUser(user);
            return user;
          });

          return room;
        });
      })
      .then(function(rooms) {
        roomBrowseResult.results = rooms;
        return roomBrowseResult;
      });
  });
}

function renderOrgPage(req, res, next) {
  return Promise.try(function() {
    var group = req.uriContext.group;
    if (!group) throw new StatusError(404);
    var groupId = group._id;
    var user = req.user;
    var policy = req.uriContext.policy;

    var currentPage = Math.max(parseInt(req.query.page, 10) || 1, 1);

    return Promise.join(
      getRoomsWithMembership(groupId, user, currentPage),
      contextGenerator.generateOrgContext(req),
      policy.canAdmin(),
      generateUserThemeSnapshot(req),
      async function(roomBrowseResult, troupeContext, isOrgAdmin, userThemeSnapshot) {
        var isStaff = req.user && req.user.staff;
        var editAccess = isOrgAdmin || isStaff;
        var orgUserCount = roomBrowseResult.totalUsers;
        var roomCount = roomBrowseResult.total;

        // Calculate total pages
        var pageCount = Math.ceil(roomCount / ROOMS_PER_PAGE);
        var rooms = roomBrowseResult.results.map(function(room) {
          var result = generateRoomCardContext(room, {
            isStaff: editAccess,
            stripGroupName: true
          });

          // No idea why this is called `isStaff`
          result.isStaff = editAccess;

          return result;
        });

        var fullUrl = clientEnv.basePath + '/' + troupeContext.group.homeUri;
        var text = encodeURIComponent('Explore our chat community on Gitter:');
        var url =
          'https://twitter.com/share?' +
          'text=' +
          text +
          '&url=' +
          fullUrl +
          '&related=gitchat' +
          '&via=gitchat';

        res.render(
          'org-page',
          await mixinHbsDataForVueLeftMenu(req, {
            bootScriptName: 'router-org-page',
            cssFileName: 'styles/org-page.css',
            hasDarkTheme: userThemeSnapshot.theme === 'gitter-dark',
            hasCachedFonts: fonts.hasCachedFonts(req.cookies),
            fonts: fonts.getFonts(),
            socialUrl: url,
            isLoggedIn: !!req.user,
            exploreBaseUrl: '/home/~explore',
            orgDirectoryUrl: fullUrl,
            roomCount: roomCount,
            orgUserCount: orgUserCount,
            group: troupeContext.group,
            rooms: rooms,
            troupeContext: troupeContext,
            pagination: {
              page: currentPage,
              pageCount: pageCount
            }
          })
        );
      }
    );
  }).catch(next);
}

module.exports = exports = {
  renderOrgPage: asyncHandler(renderOrgPage),
  testOnly: {
    getRoomMembersForRooms
  }
};
