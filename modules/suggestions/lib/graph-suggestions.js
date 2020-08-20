'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var cypher = require('cypher-promise');
var neo4jClient = cypher(env.config.get('neo4j:endpoint'));
var debug = require('debug')('gitter:app:graph-suggestions');
var _ = require('lodash');
var Promise = require('bluebird');

function query(text, params) {
  debug('neo4j query: %s %j', text, params);
  var start = Date.now();

  return Promise.resolve(neo4jClient.query(text, params))
    .then(function(response) {
      stats.responseTime('suggestions.graph.query', Date.now() - start);
      debug('Neo4j response: %j', response);
      return response;
    })
    .catch(function(err) {
      stats.event('chat.search.error');
      throw err;
    });
}

/**
 * @private
 */
function queryRoomSuggestions(roomId, userId) {
  if (userId) {
    /* Given a user .... */
    return query(
      'MATCH (r:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r2:Room), (u:User) ' +
        "WHERE u.userId = {userId} AND r.roomId = {roomId} AND NOT(u-[:MEMBER]-r2) AND r2.security = 'PUBLIC'" +
        'RETURN r2.roomId, count(*) * r2.weight as occurrence ' +
        'ORDER BY occurrence DESC ' +
        'LIMIT 20',
      {
        roomId: roomId,
        userId: userId
      }
    );
  }

  /* Anonymous query */
  return query(
    'MATCH (r:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r2:Room)' +
      "WHERE r.roomId = {roomId} AND r2.security = 'PUBLIC'" +
      'RETURN r2.roomId, count(*) * r2.weight as occurrence ' +
      'ORDER BY occurrence DESC ' +
      'LIMIT 20',
    {
      roomId: roomId
    }
  );
}
/** Returns the ids of rooms suggested for the current user */
function getSuggestionsForRoom(room, user /*, locale */) {
  return queryRoomSuggestions(room.id, user && user.id).then(function(response) {
    var results = response.data.map(function(f) {
      /* Return the roomId only */
      return f[0];
    });

    debug('getSuggestionsForRoom: %j', results);

    return results;
  });
}

/**
 * Returns the ids of rooms suggested for the current user
 * This is not currently used
 */
function getSuggestionsForUser(user /*, locale */) {
  return query(
    'MATCH (u:User)-[:MEMBER]->(:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r:Room) ' +
      "WHERE u.userId = {userId} AND NOT(u-[:MEMBER]-r) AND r.security = 'PUBLIC'" +
      'RETURN r.roomId, count(*) * r.weight as occurrence ' +
      'ORDER BY occurrence DESC ' +
      'LIMIT 20',
    {
      userId: user.id
    }
  ).then(function(results) {
    return results.data.map(function(f) {
      return f[0];
    });
  });
}

function getSuggestionsForRooms(rooms, localeLanguage) {
  var roomIds = _.map(rooms, function(room) {
    return room.id ? room.id : '' + room._id;
  });

  // NOTE: include way more than what we'll use, because we're only sampling
  // the input rooms and we'll be heavily filtering this list later.
  var qry =
    'MATCH (r:Room)-[m:MEMBER]-(u:User) ' +
    'WHERE r.roomId IN {roomIds} ' +
    'WITH u ORDER BY m.weight LIMIT 1000 ' +
    'MATCH (u)-[:MEMBER]-(r2:Room) ' +
    'WHERE r2.lang = "en" OR r2.lang = {lang} AND NOT r2.roomId IN {roomIds} AND r2.security = "PUBLIC" ' +
    'RETURN r2.roomId AS roomId, count(r2) AS c ' +
    'ORDER BY c DESC ' +
    'LIMIT 20';

  var attrs = { roomIds: roomIds, lang: localeLanguage };
  return query(qry, attrs).then(function(results) {
    return results.data.map(function(f) {
      return f[0];
    });
  });
}

module.exports = {
  getSuggestionsForUser: getSuggestionsForUser,
  getSuggestionsForRoom: getSuggestionsForRoom,
  getSuggestionsForRooms: getSuggestionsForRooms
};
