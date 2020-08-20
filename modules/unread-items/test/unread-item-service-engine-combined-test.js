'use strict';

var Promise = require('bluebird');
var assert = require('assert');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var randomSeed = require('random-seed');
var _ = require('lodash');
var debug = require('debug')('gitter:tests:unread-item-service-engine-combined-tests');
var Lazy = require('lazy.js');

var TEST_ITERATIONS = parseInt(process.env.UNREAD_ENGINE_TEST_ITERATIONS, 10) || 200;
var CHECK_SLOWLOG = process.env.CHECK_SLOWLOG;

function makeNotifyList(userIds, mentionIds) {
  var mentionHash = mentionIds.reduce(function(memo, userId) {
    memo[userId] = true;
    return memo;
  }, {});

  return Lazy(userIds).map(function(userId) {
    return {
      userId: userId,
      mention: !!mentionHash[userId]
    };
  });
}

describe('unread-item-service-engine-combined #slow', function() {
  this.timeout(150000);

  after(function(done) {
    if (process.env.DISABLE_EMAIL_NOTIFY_CLEAR_AFTER_TEST) return done();

    var unreadItemServiceEngine = require('../lib/engine');
    unreadItemServiceEngine.testOnly.removeAllEmailNotifications().nodeify(done);
  });

  describe('integration tests', function() {
    var unreadItemServiceEngine, troupeId1, userId1;

    beforeEach(function() {
      unreadItemServiceEngine = require('../lib/engine');

      troupeId1 = mongoUtils.getNewObjectIdString();
      userId1 = mongoUtils.getNewObjectIdString();
    });

    if (CHECK_SLOWLOG) {
      beforeEach(function(done) {
        unreadItemServiceEngine.testOnly.redisClient.slowlog('RESET', done);
      });

      afterEach(function(done) {
        unreadItemServiceEngine.testOnly.redisClient.slowlog('GET', 10, function(err, result) {
          if (result.length > 0) {
            assert(false, 'Test generated slowlog entries');
          }
          done();
        });
      });
    }

    var idSeed = 0;
    function nextId() {
      idSeed = idSeed + 1000;
      return mongoUtils.createIdForTimestamp(idSeed).toString();
    }

    function runWithSeed(seed) {
      var count = 0;
      var unreadItems = {};
      var mentionItems = {};

      var rand = randomSeed.create('' + seed);

      function enforceLimit() {
        var u = Object.keys(unreadItems);
        var l = u.length;
        if (l > 100) {
          while (l > 100) {
            var lowestKey = _.min(u, mongoUtils.getTimestampFromObjectId);

            delete unreadItems[lowestKey];
            l--;
          }
        }
      }

      function compareUnreadItems() {
        debug(
          'comparing results: we have %s items, %s mentions',
          Object.keys(unreadItems).length,
          Object.keys(mentionItems).length
        );

        return unreadItemServiceEngine
          .getUnreadItems(userId1, troupeId1)
          .then(function(items) {
            items.sort();
            var ourKeys = _.uniq(Object.keys(unreadItems).concat(Object.keys(mentionItems)));
            ourKeys.sort();
            for (var i = 0; i < ourKeys.length; i++) {
              if ('' + ourKeys[i] !== '' + items[i]) {
                // console.log('OUR KEYS (length==' + ourKeys.length + ')', JSON.stringify(ourKeys, null, '  '));
                // console.log('REDIS KEYS (length==' + items.length + ')', JSON.stringify(items, null, '  '));
                // console.log('>>>> CHECK OUT unread:chat:' + userId1 + ':' + troupeId1);

                assert.deepEqual(ourKeys, items);
                assert(
                  false,
                  'sets do not match. first problem at ' +
                    i +
                    ': ours=' +
                    ourKeys[i] +
                    '. theirs=' +
                    items[i]
                );
              }
            }

            return unreadItemServiceEngine.getAllUnreadItemCounts(userId1);
          })
          .then(function(counts) {
            var ourKeys = _.uniq(Object.keys(unreadItems).concat(Object.keys(mentionItems)));
            if (ourKeys.length) {
              assert.strictEqual(counts.length, 1);
              assert.strictEqual(counts[0].unreadItems, Object.keys(unreadItems).length);
              assert.strictEqual(counts[0].mentions, Object.keys(mentionItems).length);
            } else {
              assert.strictEqual(counts.length, 0);
            }

            return unreadItemServiceEngine.getRoomsMentioningUser(userId1);
          })
          .then(function(roomsMentioningUser) {
            if (Object.keys(mentionItems).length) {
              assert.strictEqual(roomsMentioningUser.length, 1);
            } else {
              assert.strictEqual(roomsMentioningUser.length, 0);
            }

            return unreadItemServiceEngine.getBadgeCountsForUserIds([userId1]);
          })
          .then(function(badgeCounts) {
            var ourKeys = _.uniq(Object.keys(unreadItems).concat(Object.keys(mentionItems)));

            assert.strictEqual(badgeCounts[userId1], ourKeys.length ? 1 : 0);
          });
      }

      function validateResult(result, expectUnread, expectMentions) {
        if (result.unreadCount >= 0) {
          var unreadItemCount = Object.keys(unreadItems).length;
          debug(
            'Validating unread items expected %s = actual %s',
            unreadItemCount,
            result.unreadCount
          );

          return compareUnreadItems();
        } else {
          assert(!expectUnread, 'Expencted unread items in the results hash but not there');
        }

        if (result.mentionCount >= 0) {
          var mentionCount = Object.keys(mentionItems).length;
          debug('Validating mentions expected %s = actual %s', mentionCount, result.mentionCount);

          assert.strictEqual(mentionCount, result.mentionCount);
        } else {
          assert(
            !expectMentions,
            'Expencted mentionCount in ' + JSON.stringify(result) + ' but not there'
          );
        }
      }

      function nextStep() {
        var nextOperation = rand(4);

        return [
          /* 0 */
          function addMention() {
            debug('Operation %s: addMention', count);
            var itemId = nextId();

            return unreadItemServiceEngine
              .newItemWithMentions(troupeId1, itemId, makeNotifyList([userId1], [userId1]))
              .then(function(result) {
                var resultForUser = result.find(function(f) {
                  return f.userId == userId1;
                });

                mentionItems[itemId] = true;
                unreadItems[itemId] = true;
                enforceLimit();
                return validateResult(resultForUser, true, true);
              });
          },
          /* 1 */
          function addItem() {
            debug('Operation %s: addItem', count);

            var largeNumberOfAddItems = rand(10) > 8;

            var numberOfItems = largeNumberOfAddItems ? rand(100) + 30 : rand(10) + 1;

            debug('Adding %s new unread items', numberOfItems);

            return _.range(numberOfItems).reduce(function(memo) {
              function addNewItem() {
                var itemId = nextId();
                return unreadItemServiceEngine
                  .newItemWithMentions(troupeId1, itemId, makeNotifyList([userId1], []))
                  .then(function(result) {
                    var resultForUser = result.find(function(f) {
                      return f.userId == userId1;
                    });
                    unreadItems[itemId] = false;
                    enforceLimit();

                    return validateResult(resultForUser, true, false);
                  });
              }
              if (memo) {
                return memo.then(function() {
                  return addNewItem();
                });
              }

              return addNewItem();
            }, null);
          },
          /* 2 */
          function markItemRead() {
            debug('Operation %s: markItemRead', count);

            var largeMarkAsRead = rand(10) > 8;

            var percentageOfItems = rand(largeMarkAsRead ? 100 : 30) / 100;

            var readCandidates = _.uniq(Object.keys(unreadItems).concat(Object.keys(mentionItems)));

            var itemsForReadLength = Math.round(readCandidates.length * percentageOfItems + 1);
            var forMarkAsRead = [];
            for (
              var j = 0;
              forMarkAsRead.length < itemsForReadLength && readCandidates.length > 0;
              j++
            ) {
              var itemIndex = rand(readCandidates.length);
              var deleted = readCandidates.splice(itemIndex, 1);
              forMarkAsRead.push(deleted);
            }

            var itemsContainedMentions = forMarkAsRead.some(function(itemId) {
              return mentionItems[itemId];
            });

            debug('Marking %s items as read', forMarkAsRead.length);

            return unreadItemServiceEngine
              .markItemsRead(userId1, troupeId1, forMarkAsRead)
              .then(function(result) {
                forMarkAsRead.forEach(function(itemId) {
                  delete unreadItems[itemId];
                  delete mentionItems[itemId];
                });

                return validateResult(result, true, itemsContainedMentions);
              });
          },
          /* 3 */
          function markAllItemsRead() {
            /* Only perform this operation one time in 3 */
            if (rand(3) !== 0) return Promise.resolve();

            debug('Operation %s: markAllItemsRead', count);

            return unreadItemServiceEngine
              .ensureAllItemsRead(userId1, troupeId1)
              .then(function(result) {
                unreadItems = {};
                var hadMentionIds = Object.keys(mentionItems).length > 0;
                mentionItems = {};
                return validateResult(result, true, hadMentionIds);
              });
          }
        ][nextOperation]();
      }

      function next() {
        count++;
        if (count > TEST_ITERATIONS) return; /* completed */

        return nextStep().then(next);
      }

      return next();
    }

    it('test1', function(done) {
      runWithSeed(2345678).nodeify(done);
    });

    it('test2', function(done) {
      runWithSeed(1231123).nodeify(done);
    });

    it('test3', function(done) {
      runWithSeed(393828).nodeify(done);
    });

    it('test4', function(done) {
      runWithSeed(122828).nodeify(done);
    });
  });
});
