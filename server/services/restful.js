'use strict';

var env = require('gitter-web-env');
var logger = env.logger;

var Promise = require('bluebird');
var StatusError = require('statuserror');
var gitHubProfileService = require('gitter-web-github-backend/lib/github-profile-service');
var groupService = require('gitter-web-groups/lib/group-service');
var groupMembershipService = require('gitter-web-groups/lib/group-membership-service');
var restSerializer = require('../serializers/rest-serializer');
var unreadItemService = require('gitter-web-unread-items');
var chatService = require('gitter-web-chats');
var userService = require('gitter-web-users');
var userTypeahead = require('./typeaheads/user-typeahead');
var eventService = require('gitter-web-events');
var roomService = require('gitter-web-rooms');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var orgService = require('./org-service');
var repoService = require('./repo-service');
var userScopes = require('gitter-web-identity/lib/user-scopes');

var survivalMode = !!process.env.SURVIVAL_MODE || false;

if (survivalMode) {
  logger.error('WARNING: Running in survival mode');
}

var DEFAULT_CHAT_COUNT_LIMIT = 30;
var DEFAULT_USERS_LIMIT = 30;
var MAX_USERS_LIMIT = 100;

function serializeTroupesForUser(userId, callback) {
  if (!userId) return Promise.resolve([]);

  return roomService
    .findAllRoomsIdsForUserIncludingMentions(userId)
    .spread(function(allTroupeIds, nonMemberTroupeIds) {
      var strategy = new restSerializer.TroupeIdStrategy({
        currentUserId: userId,
        includePermissions: true,
        // This will save the troupeId strategy
        // from having to do a second query
        nonMemberTroupeIds: nonMemberTroupeIds,
        includeTags: true
      });

      return restSerializer.serialize(allTroupeIds, strategy);
    })
    .nodeify(callback);
}

async function serializeChatsForTroupe(
  troupeId,
  userId,
  { limit = DEFAULT_CHAT_COUNT_LIMIT, lean, aroundId, lookups, beforeInclId, includeThreads }
) {
  const chatMessages = await chatService.findChatMessagesForTroupe(troupeId, {
    limit,
    aroundId,
    beforeInclId,
    includeThreads
  });
  const strategy = new restSerializer.ChatStrategy({
    notLoggedIn: !userId,
    initialId: aroundId,
    currentUserId: userId,
    troupeId,
    lean,
    lookups
  });
  return restSerializer.serialize(chatMessages, strategy);
}

function serializeUsersMatchingSearchTerm(roomId, searchTerm) {
  if (survivalMode || searchTerm.length < 1) {
    return Promise.resolve([]);
  }

  return userTypeahead.query(searchTerm, { roomId }).then(function(users) {
    const strategy = new restSerializer.UserStrategy();
    return restSerializer.serialize(users, strategy);
  });
}

/**
 *
 * @param {*} options Options can be:
 *      - `limit` - maximum amount of records retrieved
 *      - `lean` - if true, the result is not full mongoose model, just plain object
 *      - `skip` - how many first records should be omitted (used for pagination)
 */
function serializeUsersForTroupe(troupeId, userId, { limit, lean, skip }) {
  limit = isNaN(limit) ? DEFAULT_USERS_LIMIT : limit;
  skip = isNaN(skip) ? 0 : skip;
  if (limit > MAX_USERS_LIMIT) {
    limit = MAX_USERS_LIMIT;
  }
  return roomMembershipService
    .findMembersForRoom(troupeId, { limit, skip })
    .then(function(userIds) {
      var strategy = new restSerializer.UserIdStrategy({
        showPresenceForTroupeId: troupeId,
        includeRolesForTroupeId: troupeId,
        currentUserId: userId,
        lean: !!lean
      });

      return restSerializer.serialize(userIds, strategy);
    });
}

function serializeUnreadItemsForTroupe(troupeId, userId, callback) {
  return Promise.all([
    roomMembershipService.getMemberLurkStatus(troupeId, userId),
    unreadItemService.getUnreadItemsForUser(userId, troupeId)
  ])
    .spread(function(isLurking, items) {
      if (isLurking) {
        items._meta = { lurk: true };
      }
      return items;
    })
    .nodeify(callback);
}

function serializeReadBysForChat(troupeId, chatId, callback) {
  // TODO: assert that troupeId=chat.troupeId....
  return chatService
    .findById(chatId)
    .then(function(chatMessage) {
      var strategy = new restSerializer.UserIdStrategy({});

      return restSerializer.serialize(chatMessage.readBy, strategy);
    })
    .nodeify(callback);
}

function serializeEventsForTroupe(troupeId, userId, callback) {
  return eventService
    .findEventsForTroupe(troupeId, {})
    .then(function(events) {
      var strategy = new restSerializer.EventStrategy({
        currentUserId: userId,
        troupeId: troupeId
      });
      return restSerializer.serialize(events, strategy);
    })
    .nodeify(callback);
}

async function serializeOrgsForUser(user) {
  const orgs = await orgService.getOrgsForUser(user);

  const strategyMap = {
    gitlab: new restSerializer.GitlabGroupStrategy(),
    github: new restSerializer.GithubOrgStrategy({
      currentUserId: user && user._id
    })
  };

  const serializeOrgPromises = orgs.map(org => {
    const strategy = strategyMap[org.backend];

    return restSerializer.serializeObject(org, strategy);
  });

  const serializedOrgs = await Promise.all(serializeOrgPromises);
  return serializedOrgs;
}

function serializeOrgsForUserId(userId, options) {
  return userService.findById(userId).then(function(user) {
    if (!user) return [];

    return serializeOrgsForUser(user, options);
  });
}

async function _serializeReposForUser(user, repos) {
  const strategyMap = {
    gitlab: new restSerializer.GitlabProjectStrategy(),
    github: new restSerializer.GithubRepoStrategy({
      currentUserId: user && user._id
    })
  };

  const serializeRepoPromises = repos.map(repo => {
    const strategy = strategyMap[repo.backend];

    return restSerializer.serializeObject(repo, strategy);
  });

  const serializedRepos = await Promise.all(serializeRepoPromises);
  return serializedRepos;
}

async function serializeReposForUser(user) {
  const repos = await repoService.getReposForUser(user);
  return _serializeReposForUser(user, repos);
}

async function serializeAdminReposForUser(user) {
  const repos = await repoService.getAdminReposForUser(user);
  return _serializeReposForUser(user, repos);
}

function serializeProfileForUsername(username) {
  return userService.findByUsername(username).then(function(user) {
    if (user) {
      var strategy = new restSerializer.UserProfileStrategy();
      return restSerializer.serializeObject(user, strategy);
    } else {
      var gitHubUser = { username: username };

      if (!userScopes.isGitHubUser(gitHubUser)) {
        throw new StatusError(404);
      }

      return gitHubProfileService(gitHubUser, { includeCore: true });
    }
  });
}

function serializeGroupsForUserId(userId, options) {
  if (!userId) return [];

  return groupMembershipService.findGroupsForUser(userId).then(function(groups) {
    if (!groups || !groups.length) return [];

    var strategy = new restSerializer.GroupStrategy({
      currentUserId: userId,
      lean: options && options.lean
    });

    return restSerializer.serialize(groups, strategy);
  });
}

function serializeAdminGroupsForUser(user, options) {
  if (!user) return [];

  return groupMembershipService.findAdminGroupsForUser(user).then(function(groups) {
    if (!groups || !groups.length) return [];

    var strategy = new restSerializer.GroupStrategy({
      currentUserId: user._id,
      currentUser: user,
      lean: options && options.lean
    });

    return restSerializer.serialize(groups, strategy);
  });
}

function serializeRoomsForGroupId(groupId, userId) {
  return groupService.findRoomsIdForGroup(groupId, userId).then(function(allTroupeIds) {
    var strategy = new restSerializer.TroupeIdStrategy({
      currentUserId: userId
    });

    return restSerializer.serialize(allTroupeIds, strategy);
  });
}

module.exports = {
  serializeTroupesForUser: serializeTroupesForUser,
  serializeChatsForTroupe: serializeChatsForTroupe,
  serializeUsersForTroupe: serializeUsersForTroupe,
  serializeUsersMatchingSearchTerm: serializeUsersMatchingSearchTerm,
  serializeUnreadItemsForTroupe: serializeUnreadItemsForTroupe,
  serializeReadBysForChat: serializeReadBysForChat,
  serializeEventsForTroupe: serializeEventsForTroupe,
  serializeOrgsForUser: serializeOrgsForUser,
  serializeOrgsForUserId: serializeOrgsForUserId,
  serializeReposForUser: serializeReposForUser,
  serializeAdminReposForUser: serializeAdminReposForUser,
  serializeProfileForUsername: serializeProfileForUsername,
  serializeGroupsForUserId: Promise.method(serializeGroupsForUserId),
  serializeAdminGroupsForUser: Promise.method(serializeAdminGroupsForUser),
  serializeRoomsForGroupId: serializeRoomsForGroupId
};
