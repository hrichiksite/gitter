'use strict';
var _ = require('lodash');
var context = require('gitter-web-client-context');
var realtime = require('./realtime');
var apiClient = require('./api-client');
var debug = require('debug-proxy')('app:unread-items-client');
var Backbone = require('backbone');
var appEvents = require('../utils/appevents');
var UnreadItemStore = require('./unread-items-client-store');
var log = require('../utils/log');
var raf = require('../utils/raf');
var passiveEventListener = require('../utils/passive-event-listener');
var eyeballsDetector = require('./eyeballs-detector');

module.exports = (function() {
  function limit(fn, context, timeout) {
    return _.throttle(fn.bind(context), timeout || 30, { leading: false });
  }

  function onceUserIdSet(callback, c) {
    var user = context.user();

    if (user.id) {
      callback.call(c, user.id);
    } else {
      user.once('change:id', function() {
        callback.call(c, user.id);
      });
    }
  }

  var MILLIS_BEFORE_UPDATING_LAST_ACCESS_TIME = 1000;

  /**
   * Monitor the viewport for activity from lurking users
   * and send it to the server
   */
  var LurkActivityMonitor = function(unreadItemStore, chatCollection) {
    this._store = unreadItemStore;
    this._chatCollection = chatCollection;
    this._eyeballState = true;
    this._timers = {};
    this._lastSeenItems = {};
    unreadItemStore.on('reset', this._onStoreReset, this);
    unreadItemStore.on('itemMarkedRead', this._onItemMarkedRead, this);
    chatCollection.on('reset', this._onCollectionReset, this);

    this._clearActivityBadgeLimited = limit(this._clearActivityBadge, this, 100);
  };

  LurkActivityMonitor.prototype = {
    _activity: function(itemId) {
      this._clearActivityBadgeLimited();
      var troupeId = context.getTroupeId();

      if (!itemId) {
        itemId = this._findMostRecentId();
        // Best efforts
        if (!itemId) return;
      }

      // No need to update if we've already got the latest
      if (this._lastSeenItems[troupeId] >= itemId) {
        return;
      }

      this._lastSeenItems[troupeId] = itemId;
      if (this._timers[troupeId]) return;

      this._timers[troupeId] = setTimeout(
        function() {
          debug('_updateLastAccess: %s', troupeId);

          var lastSeen = this._lastSeenItems[troupeId];
          delete this._timers[troupeId];

          // Note, we can't use the apiClient.userRoom endpoint
          // as the room may have changed since the item was read.
          // For example, after a room switch we don't want to
          // be marking items as read in another room

          apiClient.user
            .put('/rooms/' + troupeId + '/unreadItems/' + lastSeen, '', { dataType: 'text' })
            .then(function() {
              debug('_updateLastAccess done');
            });
        }.bind(this),
        MILLIS_BEFORE_UPDATING_LAST_ACCESS_TIME
      );
    },

    _findMostRecentId: function() {
      return this._chatCollection.reduce(function(memo, item) {
        if (!memo) return item.id;
        if (memo > item.id) return memo;
        return item.id;
      }, null);
    },

    _clearActivityBadge: function() {
      appEvents.trigger('clearActivityBadge', context.getTroupeId());
    },

    _onItemMarkedRead: function(itemId, mention, lurkMode) {
      if (lurkMode) {
        this._activity(itemId);
      }
    },

    _onStoreReset: function() {
      var lurk = this._store.getLurkMode();
      if (lurk && eyeballsDetector.getEyeballs()) {
        this._activity();
      }
    },

    _onCollectionReset: function() {
      this._onStoreReset();
    }
  };

  // -----------------------------------------------------
  // This component sends read notifications back to the server
  // -----------------------------------------------------

  var ReadItemSender = function(unreadItemStore) {
    this._buffer = {};
    this._sendLimited = limit(this._send, this, 1000);

    unreadItemStore.on('itemMarkedRead', this._onItemMarkedRead.bind(this));

    var bound = this._onWindowUnload.bind(this);
    ['unload', 'beforeunload'].forEach(function(e) {
      window.addEventListener(e, bound, false);
    });
  };

  ReadItemSender.prototype = {
    _onItemMarkedRead: function(itemId, mention, lurkMode) {
      // Don't sent unread items back to the server in lurk mode unless its a mention
      if (lurkMode && !mention) return;

      var troupeId = context.getTroupeId();
      var buffer = this._buffer[troupeId];
      if (!buffer) {
        buffer = this._buffer[troupeId] = {};
      }

      // All items marked as read are send back to the server
      // as chats
      buffer[itemId] = true;
      this._sendLimited();
    },

    _onWindowUnload: function() {
      if (Object.keys(this._buffer) > 0) {
        // Beware: This causes mainthread locks in Safari
        this._send({ sync: true });
      }
    },

    _send: function(options) {
      debug('_send');

      Object.keys(this._buffer).forEach(function(troupeId) {
        this._sendForRoom(troupeId, options);
      }, this);
    },

    _sendForRoom: function(troupeId, options) {
      debug('_sendForRoom: %s', troupeId);

      var items = Object.keys(this._buffer[troupeId]);
      delete this._buffer[troupeId];
      if (!items.length) return;

      var queue = { chat: items };

      var async = !options || !options.sync;

      var attempts = 0;
      function attemptPost() {
        // Note, we can't use the apiClient.userRoom endpoint
        // as the room may have changed since the item was read.
        // For example, after a room switch we don't want to
        // be marking items as read in another room
        apiClient.user
          .post('/rooms/' + troupeId + '/unreadItems', queue, {
            async: async,
            global: false
          })
          .catch(function() {
            debug('Error posting unread items to server. Will attempt again in 5s');

            if (++attempts < 10) {
              // Unable to send messages, requeue them and try again in 5s
              setTimeout(attemptPost, 5000);
            }
          });
      }

      onceUserIdSet(attemptPost);
    }
  };

  // -----------------------------------------------------
  // Sync unread items with realtime notifications coming from the server
  // -----------------------------------------------------

  var TroupeUnreadItemRealtimeSync = function(unreadItemStore) {
    this._store = unreadItemStore;
  };

  _.extend(TroupeUnreadItemRealtimeSync.prototype, Backbone.Events, {
    _subscribe: function() {
      var store = this._store;
      var templateSubscription = realtime.getClient().subscribeTemplate({
        urlTemplate: '/v1/user/:userId/rooms/:troupeId/unreadItems',
        contextModel: context.contextModel(),
        onMessage: function(message) {
          debug('Realtime: Channel message: %j', message);

          switch (message.notification) {
            // New unread items
            case 'unread_items':
              store.add(message.items);
              break;

            // Unread items removed
            case 'unread_items_removed':
              store.remove(message.items);
              break;

            // New unread items
            case 'mark_all_read':
              store.markAllReadNotification();
              break;

            // Lurk mode switched on/off
            case 'lurk_change':
              if (message.lurk) {
                store.enableLurkMode();
              } else {
                store.disableLurkMode();
              }
              break;
          }
        },

        handleSnapshot: function(snapshot) {
          debug('Realtime: Channel snapshot: %j', snapshot);

          var roomMember = context.troupe().get('roomMember');
          var lurk = snapshot._meta && snapshot._meta.lurk;
          var isLurking = lurk || !roomMember;

          // TODO: send the recently marked items back to the server
          store.reset(snapshot, isLurking);
        }
      });

      templateSubscription.on('resubscribe', function() {
        debug('Realtime: resubscribe');

        store.state = 'LOADING';
        store.reset();
      });
    }
  });

  // -----------------------------------------------------
  // Monitors the view port and tells the store when things
  // have been read
  // -----------------------------------------------------

  var TroupeUnreadItemsViewportMonitor = function(scrollElement, unreadItemStore, collectionView) {
    var boundGetBounds = this._getBounds.bind(this);
    var limitedGetBounds = limit(this._getBounds, this, 100);
    var debouncedGetBounds = _.debounce(this._getBounds.bind(this), 100);
    this._collectionView = collectionView;
    this._scrollElement = scrollElement[0] || scrollElement;

    this._store = unreadItemStore;
    this._windowScrollLimited = limit(this._windowScroll, this, 50);

    var foldCountLimited = (this._foldCountLimited = limit(this._foldCount, this, 50));

    eyeballsDetector.events.on('change', this._eyeballStateChange, this);

    function rafGetBounds() {
      raf(boundGetBounds);
    }

    passiveEventListener.addEventListener(this._scrollElement, 'scroll', rafGetBounds);

    // this is not a live collection so this will not work inside an SPA
    //$('.mobile-scroll-class').on('scroll', boundGetBounds);

    unreadItemStore.on('newcountvalue', foldCountLimited);
    ['unreadItemRemoved', 'change:status', 'itemMarkedRead', 'add'].forEach(function(evt) {
      unreadItemStore.on(evt, limitedGetBounds);
    });

    // Check for unread items when things are added to the collection
    // Only do it every 100ms or so
    collectionView.collection.on('add', debouncedGetBounds);

    // This is a catch all for for unread items that are
    // not marked as read
    setInterval(limitedGetBounds, 2000);

    // If the user seen this messages and updated the last access time in
    // a different window, mark the messages in this window as read.
    var self = this;
    collectionView.listenTo(context.troupe(), 'change:lastAccessTime', function(room) {
      if (!context.troupe().get('lurk')) return;

      var lastAccess = room.get('lastAccessTime');
      this.collection.forEach(function(chat) {
        if (!chat.get('sent')) {
          // see #1728
          debug('Chat is missing sent %j', chat);
          return;
        }
        if (chat.get('sent').isBefore(lastAccess) && chat.get('unread')) {
          self._store.markItemRead(chat.id);
        }
      });
    });
  };

  TroupeUnreadItemsViewportMonitor.prototype = {
    _viewReady: function() {
      var cv = this._collectionView;
      var childCollection = cv.collection;
      var ready = childCollection.models.length === cv.children.length;

      if (!ready) {
        debug(
          'Mismatch: collection.length=%s, collectionView.length=%s',
          childCollection.models.length,
          cv.children.length
        );
      }

      return ready;
    },

    _getBounds: function() {
      if (!eyeballsDetector.getEyeballs()) {
        this._foldCountLimited();
        return;
      }

      this._scrollBounds();

      this._windowScrollLimited();
    },

    /** Accumulate the scroll bounds, making them larger only */
    _scrollBounds: function() {
      var scrollTop = this._scrollElement.scrollTop;
      var scrollBottom = scrollTop + this._scrollElement.clientHeight;

      if (!this._scrollTop || scrollTop < this._scrollTop) {
        this._scrollTop = scrollTop;
      }

      if (!this._scrollBottom || scrollBottom > this._scrollBottom) {
        this._scrollBottom = scrollBottom;
      }
    },

    _windowScroll: function() {
      if (!eyeballsDetector.getEyeballs()) {
        return;
      }

      if (!this._viewReady()) {
        debug('Skipping windowScroll until view is ready....');
        // Not ready, try again later
        this._windowScrollLimited();
        return;
      }

      this._scrollBounds();

      var self = this;

      var topBound = this._scrollTop;
      var bottomBound = this._scrollBottom;

      delete this._scrollTop;
      delete this._scrollBottom;

      var modelsInRange = this.findModelsInViewport(topBound, bottomBound);
      modelsInRange.forEach(function(model) {
        if (!model.get('unread')) return;
        self._store.markItemRead(model.id);
      });

      this._foldCount();
    },

    /**
     *
     */
    findModelsInViewport: function(viewportTop, viewportBottom) {
      // Note: assuming the collectionView does not have a custom sort
      var cv = this._collectionView;

      var childCollection = cv.collection;
      /* Get the children with models */

      /* TEMP TEMP TEMP TEMP TEMP */
      var models;
      if (childCollection.models.length === cv.children.length) {
        models = childCollection.models;
      } else {
        debug(
          'Mismatch between childCollection.models.length (%s) and cv.children.length (%s) resorting to oddness',
          childCollection.models.length,
          cv.children.length
        );

        models = childCollection.models.filter(function(model) {
          return cv.children.findByModelCid(model.cid);
        });
      }
      /* TEMP TEMP TEMP TEMP TEMP */

      var topIndex = _.sortedIndex(models, viewportTop, function(model) {
        if (typeof model === 'number') return model;
        var view = cv.children.findByModelCid(model.cid);
        return view.el.offsetTop;
      });

      var remainingChildren = models.slice(topIndex);
      if (viewportBottom === Number.POSITIVE_INFINITY) {
        /* Thats the whole lot */
        return remainingChildren;
      }

      var bottomIndex = _.sortedIndex(remainingChildren, viewportBottom, function(model) {
        if (typeof model === 'number') return model;
        var view = cv.children.findByModelCid(model.cid);
        return view.el.offsetTop;
      });

      return remainingChildren.slice(0, bottomIndex).filter(model => !model.get('parentId')); //ignore thread messages that are for some reason marked as visible
    },

    _resetFoldModel: function() {
      acrossTheFoldModel.set({
        unreadAbove: 0,
        unreadBelow: 0,
        hasUnreadBelow: false,
        hasUnreadAbove: false,
        oldestUnreadItemId: null,
        firstUnreadItemIdBelow: null,

        mentionsAbove: 0,
        mentionsBelow: 0,
        hasMentionsAbove: false,
        hasMentionsBelow: false,
        oldestMentionId: null,
        firstMentionIdBelow: null
      });
    },

    _foldCount: function() {
      if (!this._viewReady()) {
        debug('Skipping fold count until view is ready');
        // Not ready, try again later
        this._foldCountLimited();
        return;
      }

      var store = this._store;
      var chats = store.getItems();
      if (!chats.length) {
        this._resetFoldModel();
        return;
      }

      var scrollElement = this._scrollElement;

      var topBound = scrollElement.scrollTop;
      var bottomBound = topBound + scrollElement.clientHeight;
      if (bottomBound >= scrollElement.scrollHeight - 10) {
        /* At the bottom? */
        bottomBound = Number.POSITIVE_INFINITY;
      }

      var modelsInRange = this.findModelsInViewport(topBound, bottomBound);
      if (!modelsInRange.length) {
        this._resetFoldModel();
        return;
      }

      var first = modelsInRange[0];
      var firstItemId = first.id;

      const mentions = store.getMentions();

      const isMoreRecentThanFirstVisibleId = itemId => itemId < firstItemId;

      const chatsAbove = chats.filter(isMoreRecentThanFirstVisibleId);
      const aboveCount = chatsAbove.length;
      const oldestUnreadItemId = chatsAbove[0];

      const mentionsAbove = mentions.filter(isMoreRecentThanFirstVisibleId);
      const mentionsAboveCount = mentionsAbove.length;
      const oldestMentionId = mentionsAbove[0];

      /*
        This logic used to take last visible item in the viewport and look for unreads older
        than that. But since the introduction of thread messages there is a chance that there is
        a thread message that is in the range between first and last visible item and so we repurposed
        the below count to include unreads below the main message viewport + threaded messages
      */
      const isOlderThanFirstVisibleId = itemId => itemId > firstItemId;
      const firstUnreadItemIdBelow = chats.filter(isOlderThanFirstVisibleId)[0];
      const firstMentionIdBelow = mentions.filter(isOlderThanFirstVisibleId)[0];

      acrossTheFoldModel.set({
        unreadAbove: aboveCount,
        unreadBelow: chats.length - aboveCount,
        hasUnreadAbove: aboveCount > 0,
        hasUnreadBelow: chats.length - aboveCount > 0,
        oldestUnreadItemId: oldestUnreadItemId,
        firstUnreadItemIdBelow: firstUnreadItemIdBelow,

        mentionsAbove: mentionsAboveCount,
        mentionsBelow: mentions.length - mentionsAboveCount,
        hasMentionsAbove: mentionsAboveCount > 0,
        hasMentionsBelow: mentions.length - mentionsAboveCount > 0,
        oldestMentionId: oldestMentionId,
        firstMentionIdBelow: firstMentionIdBelow
      });
    },
    _eyeballStateChange: function(newState) {
      if (newState) {
        this._getBounds();
      }
    }
  };

  function CollectionSync(store, collection) {
    collection.on('add', function(model) {
      /* Prevents a race-condition when something has already been marked as deleted */
      if (!model.id || !model.get('unread')) return;
      if (store.isMarkedAsRead(model.id)) {
        debug('item already marked as read');
        model.set('unread', false);
      }
    });

    store.on('unreadItemRemoved', function(itemId) {
      debug('CollectionSync: unreadItemRemoved: %s mention=%s', itemId);
      collection.patch(itemId, { unread: false, mentioned: false }, { fast: true });
    });

    store.on('itemMarkedRead', function(itemId, mention) {
      debug('CollectionSync: itemMarkedRead: %s mention=%s', itemId, mention);

      collection.patch(itemId, { unread: false, mentioned: mention });
    });

    store.on('change:status', function(itemId, mention) {
      debug('CollectionSync: change:status: %s mention=%s', itemId);

      collection.patch(itemId, { unread: true, mentioned: mention });
    });

    store.on('add', function(itemId, mention) {
      debug('CollectionSync: add: %s mention=%s', itemId, mention);

      // See https://github.com/troupe/gitter-webapp/issues/1055
      function patchComplete(id, found) {
        if (found) return;
        // Only perform this sanity check if we're at the bottom
        // of the collection
        if (!collection.atBottom) return;
        if (!collection.length) return;
        var firstItem = collection.at(0);
        if (id < firstItem.id) return;

        // At this point, we know that the patch was for an item which
        // should be in the collection, but was not found.
        // This is a problem
        log.warn('An unread item does not exist in the chat collection: id=' + id);
        appEvents.trigger('stats.event', 'missing.chat.item');
      }

      collection.patch(itemId, { unread: true, mentioned: mention }, null, patchComplete);
    });

    store.on('reset', function() {
      debug('CollectionSync: reset');
      var items = store.getItemHash();

      collection.each(function(model) {
        var id = model.id;
        var unreadState = items[id];
        var setOptions = { fast: true };

        if (unreadState === false) {
          model.set({ unread: true, mentioned: false }, setOptions);
        } else if (unreadState === true) {
          model.set({ unread: true, mentioned: true }, setOptions);
        } else {
          model.set({ unread: false, mentioned: false }, setOptions);
        }
      });
    });
  }

  var _unreadItemStore;

  /**
   * Returns an instance of the unread items store,
   * or throws an error if it's not obtainable
   */
  function getUnreadItemStore() {
    if (_unreadItemStore) return _unreadItemStore;

    if (context.troupe().id) {
      _unreadItemStore = new UnreadItemStore();

      // Bridge events to appEvents
      _unreadItemStore.on('newcountvalue', function(count) {
        appEvents.trigger('unreadItemsCount', context.troupe().id, count);
      });

      new ReadItemSender(_unreadItemStore);
      var realtimeSync = new TroupeUnreadItemRealtimeSync(_unreadItemStore);
      realtimeSync._subscribe();
      // new ReadItemRemover(realtimeSync);

      return _unreadItemStore;
    }

    return null;
  }

  /**
   * Returns an instance of the unread items store,
   * or throws an error if it's not obtainable
   */
  function getUnreadItemStoreReq() {
    var store = getUnreadItemStore();
    if (store) return store;

    throw new Error('Unable to create an unread items store without a user');
  }

  var acrossTheFoldModel = new Backbone.Model({
    defaults: {
      unreadAbove: 0,
      unreadBelow: 0,
      hasUnreadBelow: false,
      hasUnreadAbove: false,
      belowItemId: null
    }
  });

  var unreadItemsClient = {
    acrossTheFold: function() {
      return acrossTheFoldModel;
    },

    markAllRead: function() {
      var unreadItemStore = getUnreadItemStoreReq();

      onceUserIdSet(function() {
        apiClient.userRoom.delete('/unreadItems/all').then(function() {
          unreadItemStore.markAllRead();
        });
      });
    },

    markItemRead: function(itemId) {
      const unreadItemStore = getUnreadItemStoreReq();
      unreadItemStore.markItemRead(itemId);
    },

    syncCollections: function(collections) {
      var unreadItemStore = getUnreadItemStoreReq();
      new CollectionSync(unreadItemStore, collections.chat);
    },

    monitorViewForUnreadItems: function($el, collectionView) {
      var unreadItemStore = getUnreadItemStoreReq();
      new LurkActivityMonitor(_unreadItemStore, collectionView.collection);
      return new TroupeUnreadItemsViewportMonitor($el, unreadItemStore, collectionView);
    },

    _TestOnlyTroupeUnreadItemsViewportMonitor: TroupeUnreadItemsViewportMonitor
  };

  // Mainly useful for testing
  unreadItemsClient.getStore = function() {
    return _unreadItemStore;
  };
  unreadItemsClient.UnreadItemStore = UnreadItemStore;

  /* Expose */
  window._unreadItems = unreadItemsClient;

  return unreadItemsClient;
})();
