/* eslint complexity: ["error", 24] */
'use strict';

var Promise = require('bluebird');
var debug = require('debug')('gitter:infra:serializer:troupe');
var getVersion = require('gitter-web-serialization/lib/get-model-version');
var UserIdStrategy = require('./user-id-strategy');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var avatars = require('gitter-web-avatars');
var getRoomNameFromTroupeName = require('gitter-web-shared/get-room-name-from-troupe-name');
var AllUnreadItemCountStrategy = require('./troupes/all-unread-item-count-strategy');
var FavouriteTroupesForUserStrategy = require('./troupes/favourite-troupes-for-user-strategy');
var LastTroupeAccessTimesForUserStrategy = require('./troupes/last-access-times-for-user-strategy');
var LurkAndActivityForUserStrategy = require('./troupes/lurk-and-activity-for-user-strategy');
var ProOrgStrategy = require('./troupes/pro-org-strategy');
var RoomMembershipStrategy = require('./troupes/room-membership-strategy');
var TagsStrategy = require('./troupes/tags-strategy');
var TroupePermissionsStrategy = require('./troupes/troupe-permissions-strategy');
var GroupIdStrategy = require('./group-id-strategy');
var SecurityDescriptorStrategy = require('./security-descriptor-strategy');
var AssociatedRepoStrategy = require('./troupes/associated-repo-strategy');
/*
  room-based-feature-toggle
  We used to use this strategy for the threadedConversations feature toggle but don't need it now that is generally available.
  If you're introducing another room based feature toggle, uncomment all of these pieces of code (search for room-based-feature-toggle)
*/
// const TroupeMetaIdStrategy = require('./troupes/troupe-meta-id-strategy');

function getAvatarUrlForTroupe(serializedTroupe, options) {
  if (serializedTroupe.oneToOne && options && options.user) {
    return avatars.getForUser(options.user);
  } else if (serializedTroupe.oneToOne && (!options || !options.user)) {
    return avatars.getForRoomUri(options.name);
  } else if (options && options.group) {
    return options.group.avatarUrl || avatars.getForGroup(options.group);
  } else {
    return avatars.getForRoomUri(serializedTroupe.uri);
  }
}

/**
 * Given the currentUser and a sequence of troupes
 * returns the 'other' userId for all one to one rooms
 */
function oneToOneOtherUserSequence(currentUserId, troupes) {
  return troupes
    .filter(function(troupe) {
      return troupe.oneToOne;
    })
    .map(function(troupe) {
      var a = troupe.oneToOneUsers[0] && troupe.oneToOneUsers[0].userId;
      var b = troupe.oneToOneUsers[1] && troupe.oneToOneUsers[1].userId;

      if (mongoUtils.objectIDsEqual(currentUserId, a)) {
        return b;
      } else {
        return a;
      }
    });
}

/** Best guess efforts */
function guessLegacyGitHubType(item) {
  if (item.githubType) {
    return item.githubType;
  }

  if (item.oneToOne) {
    return 'ONETOONE';
  }

  if (!item.sd) return 'REPO_CHANNEL'; // Could we do better?

  var linkPath = item.sd.linkPath;

  switch (item.sd.type) {
    case 'GH_REPO':
      if (item.uri === linkPath) {
        return 'REPO';
      } else {
        return 'REPO_CHANNEL';
      }
    /* break */

    case 'GH_ORG':
      if (item.uri === linkPath) {
        return 'REPO';
      } else {
        return 'REPO_CHANNEL';
      }
    /* break */

    case 'GH_USER':
      return 'USER_CHANNEL';
  }

  return 'REPO_CHANNEL';
}

/** Best guess efforts */
function guessLegacySecurity(item) {
  if (item.security) {
    return item.security;
  }

  // One-to-one rooms in legacy had security=null
  if (item.oneToOne) {
    return undefined;
  }

  if (item.sd.public) {
    return 'PUBLIC';
  }

  var type = item.sd.type;
  if (type === 'GH_REPO' || type === 'GH_ORG') {
    if (item.sd.linkPath && item.sd.linkPath !== item.uri) {
      return 'INHERITED';
    }
  }

  return 'PRIVATE';
}

function TroupeStrategy(options) {
  if (!options) options = {};

  var currentUserId = mongoUtils.asObjectID(options.currentUserId);

  var unreadItemStrategy;
  var lastAccessTimeStrategy;
  var favouriteStrategy;
  var lurkActivityStrategy;
  var tagsStrategy;
  var userIdStrategy;
  var proOrgStrategy;
  var permissionsStrategy;
  var roomMembershipStrategy;
  var groupIdStrategy;
  var securityDescriptorStrategy;
  var associatedRepoStrategy;

  this.preload = function(items) {
    // eslint-disable-line max-statements
    if (items.isEmpty()) return;

    var troupeIds = items.map(function(troupe) {
      return troupe._id;
    });

    var strategies = [];

    // Pro-org
    if (options.includePremium !== false) {
      proOrgStrategy = new ProOrgStrategy(options);
      strategies.push(proOrgStrategy.preload(items));
    }

    // Room Membership
    if (currentUserId || options.isRoomMember !== undefined) {
      roomMembershipStrategy = new RoomMembershipStrategy(options);
      strategies.push(roomMembershipStrategy.preload(troupeIds));
    }

    // Unread items
    if (currentUserId && !options.skipUnreadCounts) {
      unreadItemStrategy = new AllUnreadItemCountStrategy(options);
      strategies.push(unreadItemStrategy.preload(troupeIds));
    }

    if (currentUserId) {
      // The other user in one-to-one rooms
      var otherUserIds = oneToOneOtherUserSequence(currentUserId, items);
      if (!otherUserIds.isEmpty()) {
        userIdStrategy = new UserIdStrategy(options);
        strategies.push(userIdStrategy.preload(otherUserIds));
      }

      // Favourites for user
      favouriteStrategy = new FavouriteTroupesForUserStrategy(options);
      strategies.push(favouriteStrategy.preload());

      // Last Access Time
      lastAccessTimeStrategy = new LastTroupeAccessTimesForUserStrategy(options);
      strategies.push(lastAccessTimeStrategy.preload());

      // Lurk Activity
      lurkActivityStrategy = new LurkAndActivityForUserStrategy(options);
      strategies.push(lurkActivityStrategy.preload());
    }

    // Permissions
    if ((currentUserId || options.currentUser) && options.includePermissions) {
      permissionsStrategy = new TroupePermissionsStrategy(options);
      strategies.push(permissionsStrategy.preload(items));
    }

    // Include the tags
    if (options.includeTags) {
      tagsStrategy = new TagsStrategy(options);
      strategies.push(tagsStrategy.preload(items));
    }

    groupIdStrategy = new GroupIdStrategy(options);
    var groupIds = items
      .map(function(troupe) {
        return troupe.groupId;
      })
      .filter(function(f) {
        return !!f;
      });

    strategies.push(groupIdStrategy.preload(groupIds));

    if (options.includeBackend) {
      securityDescriptorStrategy = SecurityDescriptorStrategy.slim();
      // Backend strategy needs no mapping stage
    }

    if (options.includeAssociatedRepo) {
      associatedRepoStrategy = new AssociatedRepoStrategy();
      strategies.push(associatedRepoStrategy.preload(items));
    }

    /* room-based-feature-toggle */
    // troupeMetaIdStrategy = new TroupeMetaIdStrategy();
    // strategies.push(troupeMetaIdStrategy.preload(troupeIds));

    return Promise.all(strategies);
  };

  function mapOtherUser(users) {
    var otherUser = users.filter(function(troupeUser) {
      return '' + troupeUser.userId !== '' + currentUserId;
    })[0];

    if (otherUser) {
      var user = userIdStrategy.map(otherUser.userId);
      if (user) {
        return user;
      }
    }
  }

  function resolveOneToOneOtherUser(item) {
    if (!currentUserId) {
      debug(
        'TroupeStrategy initiated without currentUserId, but generating oneToOne troupes. This can be a problem!'
      );
      return null;
    }

    var otherUser = mapOtherUser(item.oneToOneUsers);

    if (!otherUser) {
      debug('Troupe %s appears to contain bad users', item._id);
      return null;
    }

    return otherUser;
  }

  // eslint-disable-next-line complexity
  this.map = function(item) {
    var id = item.id || item._id;
    var uri = item.uri;

    var isPro = proOrgStrategy ? proOrgStrategy.map(item) : undefined;
    var group = groupIdStrategy && item.groupId ? groupIdStrategy.map(item.groupId) : undefined;

    var troupeName, troupeUrl;
    if (item.oneToOne) {
      var otherUser = resolveOneToOneOtherUser(item);
      if (otherUser) {
        troupeName = otherUser.displayName;
        troupeUrl = '/' + otherUser.username;
      } else {
        return null;
      }
    } else {
      var roomName = getRoomNameFromTroupeName(uri);
      troupeName = group ? group.name + '/' + getRoomNameFromTroupeName(uri) : uri;
      if (roomName === uri) {
        troupeName = group ? group.name : uri;
      }

      troupeUrl = '/' + uri;
    }

    var unreadCounts = unreadItemStrategy && unreadItemStrategy.map(id);

    // mongoose is upgrading old undefineds to [] on load and we don't want to
    // send through that no providers are allowed in that case
    const providers = item.providers && item.providers.length ? item.providers : undefined;

    var isLurking;
    var hasActivity;
    if (lurkActivityStrategy) {
      isLurking = lurkActivityStrategy.mapLurkStatus(id);
      if (isLurking) {
        // Can only have activity if you're lurking
        hasActivity = lurkActivityStrategy.mapActivity(id);
      }
    }

    var isPublic;
    if (item.oneToOne) {
      // Double-check here
      isPublic = false;
    } else {
      isPublic = item.sd.public;
    }

    var avatarUrl = getAvatarUrlForTroupe(item, {
      name: troupeName,
      group: group,
      user: otherUser
    });

    return {
      id: id,
      name: troupeName,
      topic: item.topic,
      // This is a fallback for the change to the suggestions API
      // It can be removed once the mobile clients are using topic instead
      // of description. See https://github.com/troupe/gitter-webapp/issues/2115
      description: options.includeDescription ? item.topic : undefined,
      avatarUrl: avatarUrl,
      uri: uri,
      oneToOne: item.oneToOne,
      userCount: item.userCount,
      user: otherUser,
      unreadItems: unreadCounts ? unreadCounts.unreadItems : undefined,
      mentions: unreadCounts ? unreadCounts.mentions : undefined,
      lastAccessTime: lastAccessTimeStrategy ? lastAccessTimeStrategy.map(id).time : undefined,
      favourite: favouriteStrategy ? favouriteStrategy.map(id) : undefined,
      lurk: isLurking,
      activity: hasActivity,
      url: troupeUrl,
      githubType: guessLegacyGitHubType(item),
      associatedRepo: associatedRepoStrategy ? associatedRepoStrategy.map(item) : undefined,
      security: guessLegacySecurity(item),
      premium: isPro,
      noindex: item.noindex, // TODO: this should not always be here
      tags: tagsStrategy ? tagsStrategy.map(item) : undefined,
      providers: providers,
      permissions: permissionsStrategy ? permissionsStrategy.map(item) : undefined,
      roomMember: roomMembershipStrategy ? roomMembershipStrategy.map(id) : undefined,
      groupId: item.groupId,
      group: options.includeGroups ? group : undefined,
      backend: securityDescriptorStrategy ? securityDescriptorStrategy.map(item.sd) : undefined,
      public: isPublic,
      exists: options.includeExists ? !!id : undefined,
      /* room-based-feature-toggle */
      // meta: troupeMetaIdStrategy.map(id) || {},
      v: getVersion(item)
    };
  };
}

TroupeStrategy.prototype = {
  name: 'TroupeStrategy'
};

TroupeStrategy.createSuggestionStrategy = function() {
  return new TroupeStrategy({
    includePremium: false,
    includeTags: true,
    includeExists: true,
    // TODO: remove this option in future
    includeDescription: true,
    currentUser: null,
    currentUserId: null
  });
};

module.exports = TroupeStrategy;
module.exports.testOnly = {
  oneToOneOtherUserSequence: oneToOneOtherUserSequence
};
