'use strict';

var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var BatchStream = require('batch-stream');
var through2 = require('through2');
var ElasticBulkUpdateStream = require('./elastic-bulk-update-stream');
var bulkTools = require('./elastic-bulk-tools');
var inputsForUser = require('./elastic-inputs-for-user');
var elasticClient = require('../../utils/elasticsearch-typeahead-client');
var userService = require('gitter-web-users');
var collections = require('gitter-web-utils/lib/collections');
var uuid = require('uuid/v4');
var debug = require('debug')('gitter:app:user-typeahead');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

var INDEX_PREFIX = 'typeahead_';
var READ_INDEX_ALIAS = 'typeahead-read';
var WRITE_INDEX_ALIAS = 'typeahead-write';
var BATCH_SIZE = 1000;
var MEMBERSHIP_LIMIT = 600;

function query(text, options) {
  var roomId = (options || {}).roomId || '*';

  return elasticClient
    .suggest({
      size: 10,
      index: READ_INDEX_ALIAS,
      type: 'user',
      body: {
        suggest: {
          text: text,
          completion: {
            field: 'suggest',
            context: { rooms: roomId },
            payload: ['_uid']
          }
        }
      }
    })
    .then(function(res) {
      var options = res.suggest[0].options;
      var userIds = options.map(function(option) {
        return option.payload._uid[0].split('#')[1];
      });
      return userService.findByIds(userIds).then(function(users) {
        return collections.maintainIdOrder(userIds, users);
      });
    });
}

function reindex() {
  var newIndex = INDEX_PREFIX + uuid();

  return createIndex(newIndex)
    .then(function() {
      return setWriteAlias(newIndex);
    })
    .then(function() {
      return Promise.all([reindexUsers(), reindexMemberships()]);
    })
    .then(function() {
      return setReadAlias(newIndex);
    })
    .then(function() {
      return removeUnusedIndicies();
    });
}

function addUsersToGroupRoom(userIds, roomId) {
  var updates = userIds.map(function(userId) {
    return createAddMembershipUpdate(userId, [roomId]);
  });
  var req = bulkTools.createBulkUpdate(updates);
  return elasticClient.bulk(req).then(function(res) {
    var err = bulkTools.findErrors(req, res);
    if (err) throw err;
  });
}

function removeUsersFromRoom(userIds, roomId) {
  var updates = userIds.map(function(userId) {
    return createRemoveMembershipUpdate(userId, roomId);
  });
  var req = bulkTools.createBulkUpdate(updates);
  return elasticClient.bulk(req).then(function(res) {
    var err = bulkTools.findErrors(req, res);
    if (err) throw err;
  });
}

function upsertUser(user) {
  return elasticClient.update(createUserUpdate(user));
}

function createIndex(name) {
  debug('creating index %s', name);
  return elasticClient.indices.create({
    index: name,
    body: {
      settings: {
        number_of_shards: 4,
        number_of_replicas: 1,
        mapper: {
          dynamic: false
        }
      },
      mappings: {
        user: {
          dynamic: 'strict',
          properties: {
            suggest: {
              type: 'completion',
              analyzer: 'simple',
              search_analyzer: 'simple',
              preserve_separators: false,
              contexts: [{ name: 'rooms', type: 'category' }]
            }
          }
        }
      }
    }
  });
}

function setWriteAlias(index) {
  debug('setting %s as sole write alias (%s)', index, WRITE_INDEX_ALIAS);
  return elasticClient.indices.updateAliases({
    body: {
      actions: [
        { remove: { index: INDEX_PREFIX + '*', alias: WRITE_INDEX_ALIAS } },
        { add: { index: index, alias: WRITE_INDEX_ALIAS } }
      ]
    }
  });
}

function setReadAlias(index) {
  debug('setting %s as sole read alias (%s)', index, READ_INDEX_ALIAS);
  return elasticClient.indices.updateAliases({
    body: {
      actions: [
        { remove: { index: INDEX_PREFIX + '*', alias: READ_INDEX_ALIAS } },
        { add: { index: index, alias: READ_INDEX_ALIAS } }
      ]
    }
  });
}

function removeUnusedIndicies() {
  return elasticClient.indices.getAliases().then(function(resp) {
    var unused = Object.keys(resp).filter(function(index) {
      var aliases = Object.keys(resp[index].aliases);
      return index.indexOf(INDEX_PREFIX) === 0 && aliases.length === 0;
    });

    if (!unused.length) return;

    debug('removing indices %j', unused);
    return elasticClient.indices.delete({ index: unused });
  });
}

function reindexUsers() {
  return new Promise(function(resolve, reject) {
    var userStream = persistence.User.find()
      .lean()
      .read(mongoReadPrefs.secondaryPreferred)
      .batchSize(BATCH_SIZE)
      .stream();

    var user2elastic = through2.obj(function(user, encoding, callback) {
      this.push(createUserUpdate(user));
      callback();
    });

    var batchStream = new BatchStream({ size: BATCH_SIZE });

    var elasticBulkUpdateStream = new ElasticBulkUpdateStream(elasticClient);

    userStream
      .on('error', reject)
      .pipe(user2elastic)
      .on('error', reject)
      .pipe(batchStream)
      .on('error', reject)
      .pipe(elasticBulkUpdateStream)
      .on('error', reject)
      .on('finish', resolve);
  });
}

function reindexMemberships() {
  return new Promise(function(resolve, reject) {
    var troupeUserStream = persistence.TroupeUser.aggregate([
      {
        $group: {
          _id: '$troupeId',
          userIds: { $push: '$userId' }
        }
      },
      {
        $lookup: {
          from: 'troupes',
          localField: '_id',
          foreignField: '_id',
          as: 'troupe'
        }
      },
      {
        $match: {
          // if we allowed oneToOnes, then @mydigitalself would break elasticsearch!
          // field is missing if not one to one, but true if it is
          'troupe.oneToOne': { $ne: true }
        }
      },
      {
        $project: {
          userIds: true
        }
      },
      {
        $unwind: '$userIds'
      },
      {
        $group: {
          _id: '$userIds',
          troupeIds: { $push: '$_id' }
        }
      }
    ])
      .allowDiskUse(true)
      .read(mongoReadPrefs.secondaryPreferred)
      .cursor({ batchSize: BATCH_SIZE })
      .exec()
      .stream();

    var memberships2elastic = through2.obj(function(memberships, encoding, callback) {
      this.push(createAddMembershipUpdate(memberships._id, memberships.troupeIds));
      callback();
    });

    var batchStream = new BatchStream({ size: BATCH_SIZE });

    var elasticBulkUpdateStream = new ElasticBulkUpdateStream(elasticClient);

    troupeUserStream
      .on('error', reject)
      .pipe(memberships2elastic)
      .on('error', reject)
      .pipe(batchStream)
      .on('error', reject)
      .pipe(elasticBulkUpdateStream)
      .on('error', reject)
      .on('finish', resolve);
  });
}

function createUserUpdate(user) {
  var id = user._id.toString();
  var input = inputsForUser(user);

  return {
    index: WRITE_INDEX_ALIAS,
    type: 'user',
    id: id,
    body: {
      doc: {
        suggest: {
          input: input
        }
      },
      upsert: {
        suggest: {
          input: input,
          contexts: {
            rooms: ['*']
          }
        }
      }
    },
    _retry_on_conflict: 3
  };
}

function createAddMembershipUpdate(userId, roomIds) {
  var id = userId.toString();
  var newRooms = roomIds.map(function(roomId) {
    return roomId.toString();
  });

  if (newRooms.length > MEMBERSHIP_LIMIT) {
    // going over the limit can cause a too_complex_to_determinize_exception
    // from elastic as the automaton has a total limit of 10000 states.
    debug(
      '%s is in %d rooms which is over the limit of %d. probably troll; ignoring update',
      userId,
      newRooms.length,
      MEMBERSHIP_LIMIT
    );
    newRooms = [];
  }

  return {
    index: WRITE_INDEX_ALIAS,
    type: 'user',
    id: id,
    body: {
      // ensures roomIds are unique and that the update doenst go over the membership limit
      script:
        'ctx._source.suggest.contexts.rooms = (ctx._source.suggest.contexts.rooms + new_rooms).unique(false).take(' +
        MEMBERSHIP_LIMIT +
        ')',
      params: {
        new_rooms: newRooms
      },
      upsert: {
        suggest: {
          contexts: {
            rooms: ['*'].concat(newRooms)
          }
        }
      }
    },
    _retry_on_conflict: 3
  };
}

function createRemoveMembershipUpdate(userId, roomId) {
  return {
    index: WRITE_INDEX_ALIAS,
    type: 'user',
    id: userId.toString(),
    body: {
      script: 'ctx._source.suggest.contexts.rooms = ctx._source.suggest.contexts.rooms -= roomId',
      params: {
        roomId: roomId.toString()
      },
      upsert: {
        suggest: {
          contexts: {
            rooms: ['*']
          }
        }
      }
    },
    _retry_on_conflict: 3
  };
}

module.exports = {
  query: query,
  reindex: reindex,
  addUsersToGroupRoom: addUsersToGroupRoom,
  removeUsersFromRoom: removeUsersFromRoom,
  upsertUser: upsertUser
};
