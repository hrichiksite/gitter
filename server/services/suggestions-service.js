'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var env = require('gitter-web-env');
var config = env.config;
var promiseUtils = require('../utils/promise-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
var userService = require('gitter-web-users');
var userSettingsService = require('gitter-web-user-settings');
var userScopes = require('gitter-web-identity/lib/user-scopes');
var graphSuggestions = require('gitter-web-suggestions');
var cacheWrapper = require('gitter-web-cache-wrapper');
var debug = require('debug')('gitter:app:suggestions');
var logger = require('gitter-web-env').logger;
var groupRoomSuggestions = require('gitter-web-groups/lib/group-room-suggestions');

// the old github recommenders that find repos, to be filtered to rooms
// var ownedRepos = require('./recommendations/owned-repos');
var starredRepos = require('./recommendations/starred-repos');
// var watchedRepos = require('./recommendations/watched-repos');

var EXPIRES_SECONDS = config.get('suggestions:cache-timeout');

var NUM_SUGGESTIONS = 12;
var MAX_SUGGESTIONS_PER_ORG = 2;
var HIGHLIGHTED_ROOMS = [
  {
    uri: 'gitter/gitter',
    localeLanguage: 'en'
  },
  {
    uri: 'gitter/developers',
    localeLanguage: 'en'
  },
  {
    uri: 'LaravelRUS/chat',
    localeLanguage: 'ru'
  },
  {
    uri: 'google/material-design-lite',
    localeLanguage: 'en'
  },
  {
    uri: 'pydata/pandas',
    localeLanguage: 'en'
  },
  {
    uri: 'PerfectlySoft/Perfect',
    localeLanguage: 'en'
  },
  {
    uri: 'twbs/bootstrap',
    localeLanguage: 'en'
  },
  {
    uri: 'scala-js/scala-js',
    localeLanguage: 'en'
  },
  {
    uri: 'gitter/nodejs',
    localeLanguage: 'en'
  },
  {
    uri: 'FreeCodeCamp/FreeCodeCamp',
    localeLanguage: 'en'
  },
  {
    uri: 'webpack/webpack',
    localeLanguage: 'en'
  },
  {
    uri: 'angular-ui/ng-grid',
    localeLanguage: 'en'
  },
  {
    uri: 'dev-ua/frontend-ua',
    localeLanguage: 'ua'
  },
  {
    uri: 'rus-speaking/android',
    localeLanguage: 'ru'
  },
  {
    uri: 'FreeCodeCamp/Espanol',
    localeLanguage: 'es'
  }
];

function reposToRooms(repos) {
  // Limit to a sane number that's a bit higher than the number we'll use
  // because we're still going to be filtering out the ones the user is already
  // in later.
  repos = repos.slice(0, 100);

  var uris = _.map(repos, function(repo) {
    return repo.uri;
  });

  return troupeService.findPublicRoomsByTypeAndLinkPaths('GH_REPO', uris);
}

// var ownedRepoRooms = Promise.method(function(options) {
//   var user = options.user;
//   if (!user || !userScopes.isGitHubUser(user)) {
//     return [];
//   }
//
//   debug('checking ownedRepoRooms');
//
//   return ownedRepos(user)
//     .then(reposToRooms)
//     .then(function(rooms) {
//       if (debug.enabled) {
//         debug("ownedRepoRooms", _.pluck(rooms, "uri"));
//       }
//       return rooms;
//     });
// });

var starredRepoRooms = Promise.method(function(options) {
  var user = options.user;
  if (!user || !userScopes.isGitHubUser(user)) {
    return [];
  }

  debug('checking starredRepoRooms');

  return starredRepos(user)
    .then(reposToRooms)
    .then(function(rooms) {
      if (debug.enabled) {
        debug('starredRepoRooms', _.pluck(rooms, 'uri'));
      }
      return rooms;
    });
});

// var watchedRepoRooms = Promise.method(function(options) {
//   var user = options.user;
//   if (!user || !userScopes.isGitHubUser(user)) {
//     return [];
//   }
//
//   debug('checking watchedRepoRooms');
//
//   return watchedRepos(user)
//     .then(reposToRooms)
//     .then(function(rooms) {
//       if (debug.enabled) {
//         debug("watchedRepoRooms", _.pluck(rooms, "uri"));
//       }
//       return rooms;
//     });
// });

var graphRooms = Promise.method(function(options) {
  var existingRooms = options.rooms;

  if (!existingRooms || !existingRooms.length) {
    return [];
  }

  debug('checking graphRooms');

  var language = options.language;

  // limit how many we send to neo4j
  var firstTen = existingRooms.slice(0, 10);
  return graphSuggestions
    .getSuggestionsForRooms(firstTen, language)
    .timeout(2000)
    .then(function(roomIds) {
      return troupeService.findByIdsLean(roomIds);
    })
    .then(function(suggestedRooms) {
      // Make sure there are no more than MAX_SUGGESTIONS_PER_ORG per
      // organisation coming out of the graph.
      // (The siblingRooms step might just add them back in anyway which is why
      //  this is not a standard step in filterRooms())
      var orgTotals = {};

      _.remove(suggestedRooms, function(room) {
        if (orgTotals[room.groupId]) {
          orgTotals[room.groupId] += 1;
        } else {
          orgTotals[room.groupId] = 1;
        }

        return orgTotals[room.groupId] > MAX_SUGGESTIONS_PER_ORG;
      });

      if (debug.enabled) {
        debug('graphRooms', _.pluck(suggestedRooms, 'uri'));
      }

      return suggestedRooms;
    })
    .catch(function(err) {
      logger.error('Neo4J error: ' + err, {
        exception: err
      });
      return [];
    });
});

var siblingRooms = Promise.method(function(options) {
  var existingRooms = options.rooms;
  var user = options.user;

  if (!user || !existingRooms || !existingRooms.length) {
    return [];
  }

  var userId = user._id;

  debug('checking siblingRooms');

  var groupIds = _.pluck(existingRooms, 'groupId').filter(function(groupId) {
    return !!groupId;
  });

  return groupRoomSuggestions
    .findUnjoinedRoomsInGroups(userId, _.uniq(groupIds))
    .then(function(results) {
      if (debug.enabled) {
        debug('siblingRooms', _.pluck(results, 'uri'));
      }

      return results;
    });
});

function hilightedRooms(options) {
  var language = options.language;

  // shuffle so we don't always present the same ones first
  var shuffled = _.shuffle(HIGHLIGHTED_ROOMS);

  var filtered = _.filter(shuffled, function(roomInfo) {
    var roomLang = roomInfo.localeLanguage;
    return roomLang === 'en' || roomLang === language;
  });

  var uris = _.map(filtered, function(highlighted) {
    return highlighted.uri;
  });

  return troupeService.findByUris(uris).then(function(suggestedRooms) {
    if (debug.enabled) {
      debug('hilightedRooms', _.pluck(suggestedRooms, 'uri'));
    }

    return suggestedRooms;
  });
}

function filterRooms(suggested, existing) {
  // not necessarily sure where suggested comes from, so make sure id is filled
  // in and a string so we can safely use that as a key in a map.
  mongooseUtils.addIdToLeanArray(suggested);

  // remove all the nulls/undefineds from things that didn't exist
  var filtered = _.filter(suggested);

  // filter out the existing rooms
  var existingMap = _.indexBy(existing, 'id');
  filtered = _.filter(filtered, function(room) {
    // make very sure we only find public rooms
    if (room.security !== 'PUBLIC') {
      return false;
    }
    return existingMap[room.id] === undefined;
  });

  // filter out duplicates
  var roomMap = {};
  filtered = _.filter(filtered, function(room) {
    if (roomMap[room.id]) {
      return false;
    } else {
      roomMap[room.id] = true;
      return true;
    }
  });

  return filtered;
}

var recommenders = [
  // Disabling these for now because they both just tend to find "my-org/*" and
  // we have other places to suggest those already and you certainly have other
  // ways of discovering or being told about your orgs' own rooms so I feel
  // doubtful about the potential network effect here.
  //ownedRepoRooms,
  //watchedRepoRooms,
  starredRepoRooms,
  graphRooms,
  siblingRooms,
  hilightedRooms
];

/**
 * options can have the following and they are all optional
 * - user
 * - rooms (array)
 * - language (defaults to 'en')
 * The plugins can just skip themselves if options doesn't contain what they need.
 */
function findSuggestionsForRooms(options) {
  var existingRooms = options.rooms || [];
  var language = options.language || 'en';

  // copy the defaults back in so all the plugins get the defaults
  options.rooms = existingRooms;
  options.language = language;

  // 1to1 rooms aren't included in the graph anyway, so filter them out first
  existingRooms = _.filter(existingRooms, function(room) {
    return room.oneToOne !== true;
  });

  function filterSuggestions(results) {
    var filtered = filterRooms(results, existingRooms);
    // Add all the rooms we've found so far to the rooms used by subsequent
    // lookups. This means that a new github user that hasn't joined any rooms
    // yet but has starred some GitHub rooms can get graph results whereas
    // otherwise graphRooms would be skipped because it wouldn't have any rooms
    // to use as input. This should also benefit siblingRooms because it will
    // find siblings of suggested rooms (if it gets there) which is probably
    // better than just serving hilighted rooms.
    options.rooms = existingRooms.concat(filtered);
    return filtered;
  }

  return promiseUtils.waterfall(recommenders, [options], filterSuggestions, NUM_SUGGESTIONS);
}

/**
 * Returns rooms for a user
 * @private
 */
function findRoomsByUserId(userId) {
  return roomMembershipService.findRoomIdsForUser(userId).then(function(roomIds) {
    return troupeService.findByIdsLean(roomIds, {
      uri: 1,
      groupId: 1,
      lang: 1,
      oneToOne: 1
    });
  });
}

/**
 * Find some suggestions for the current user
 */
function findSuggestionsForUserId(userId) {
  return Promise.all([
    userService.findById(userId),
    findRoomsByUserId(userId),
    userSettingsService.getUserSettings(userId, 'lang')
  ]).spread(function(user, existingRooms, language) {
    return findSuggestionsForRooms({
      user: user,
      rooms: existingRooms,
      language: language
    });
  });
}

module.exports = {
  findSuggestionsForUserId: cacheWrapper('findSuggestionsForUserId', findSuggestionsForUserId, {
    ttl: EXPIRES_SECONDS
  }),
  findSuggestionsForRooms: findSuggestionsForRooms,
  testOnly: {
    HIGHLIGHTED_ROOMS: HIGHLIGHTED_ROOMS
  }
};
