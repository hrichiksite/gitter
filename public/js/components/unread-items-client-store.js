'use strict';
var _ = require('lodash');
var Backbone = require('backbone');
const debug = require('debug-proxy')('app:unread-items-client-store');

function limit(fn, context, timeout) {
  return _.throttle(fn.bind(context), timeout || 30, { leading: false });
}

function _iteratePreload(incoming, fn, context) {
  var chats = incoming.chat; // This is done this way to keep protocol compatibility
  var mentions = incoming.mention;

  var items = {};
  if (chats) {
    chats.forEach(function(itemId) {
      items[itemId] = false;
    });
  }
  if (mentions) {
    mentions.forEach(function(itemId) {
      items[itemId] = true;
    });
  }

  Object.keys(items).forEach(function(itemId) {
    var mentioned = items[itemId];
    fn.call(context, itemId, mentioned);
  });
}

var DeletePit = function() {
  this._items = {};
  this._timer = setInterval(this._gc.bind(this), 60000);
};

DeletePit.prototype = {
  add: function(itemId) {
    this._items[itemId] = Date.now();
  },

  remove: function(itemId) {
    delete this._items[itemId];
  },

  contains: function(itemId) {
    return !!this._items[itemId];
  },

  reset: function() {
    this._items = {};
  },

  _gc: function() {
    var horizon = Date.now() - 5 * 60 * 1000; // 5 minutes
    var items = this._items;

    Object.keys(items).forEach(function(itemId) {
      if (items[itemId] < horizon) {
        delete items[itemId];
      }
    });
  }
};

// -----------------------------------------------------
// The main component of the unread-items-store
// Events:
// * newcountvalue: (length)
// * unreadItemRemoved: (itemId)
// * change:status: (itemId, mention)
// * itemMarkedRead: (itemId, mention, lurkMode)
// * add (itemId, mention)
// -----------------------------------------------------
var UnreadItemStore = function() {
  this.length = 0;
  this._lurkMode = false;
  this._items = {};
  this._read = new DeletePit();
  this.state = 'LOADING';

  this.notifyCountLimited = limit(this.notifyCount, this, 30);
};

_.extend(UnreadItemStore.prototype, Backbone.Events, {
  /**
   * Returns `true` if the result changes the state of the store
   * options: { silent } will not trigger a recount or events
   */
  _unreadItemAdded: function(itemId, mention, options) {
    debug('_unreadItemAdded', itemId, mention, options);
    // Four options here:
    // 0 - The item has already been marked as read
    // 1 - new item
    // 2 - item exists and has the same mention status as before (nullop)
    // 3 - item exists and has a different mention status to before
    var silent = options && options.silent;
    var lurkMode = this._lurkMode;

    // Case 0: already read
    if (this._read.contains(itemId)) {
      if (!silent) {
        this.trigger('itemMarkedRead', itemId, mention, lurkMode);
      }

      return false;
    }

    // Case 1: new item
    if (!this._items.hasOwnProperty(itemId)) {
      this._items[itemId] = mention;
      this.length++;

      if (!silent) {
        this.notifyCountLimited();
        this.trigger('add', itemId, mention);
      }

      return true;
    }

    // Case 2
    if (this._items[itemId] === mention) {
      return false;
    }

    // Case 3...
    this._items[itemId] = mention;
    if (!silent) {
      this.trigger('change:status', itemId, mention);
    }

    return true;
  },

  _unreadItemRemoved: function(itemId) {
    debug('_unreadItemRemoved', itemId);
    if (!this._items.hasOwnProperty(itemId)) return; // Does not exist

    delete this._items[itemId];
    this.length--;
    this.notifyCountLimited();

    this.trigger('unreadItemRemoved', itemId);
  },

  _mentionRemoved: function(itemId) {
    debug('_mentionRemoved', itemId);
    if (!this._items.hasOwnProperty(itemId)) return; // Does not exist
    this._items[itemId] = false;
    this.notifyCountLimited();

    this.trigger('change:status', itemId, false);
  },

  markItemRead: function(itemId) {
    debug('markItemRead', itemId);
    var inStore = this._items.hasOwnProperty(itemId);
    var lurkMode = this._lurkMode;

    var mentioned;
    if (!inStore) {
      mentioned = false;
    } else {
      mentioned = this._items[itemId];

      delete this._items[itemId];
      this.length--;
      this.notifyCountLimited();
    }

    this._read.add(itemId);
    this.trigger('itemMarkedRead', itemId, mentioned, lurkMode);
  },

  // via Realtime
  add: function(items) {
    _iteratePreload(
      items,
      function(itemId, mention) {
        this._unreadItemAdded(itemId, mention);
      },
      this
    );
  },

  // via Realtime
  remove: function(incoming) {
    function hashArray(array) {
      if (!array) return {};

      return array.reduce(function(memo, value) {
        memo[value] = true;
        return memo;
      }, {});
    }

    var chats = hashArray(incoming.chat);
    var mentions = hashArray(incoming.mention);
    var all = _.extend({}, chats, mentions);
    var self = this;
    Object.keys(all).forEach(function(itemId) {
      var removeChat = chats[itemId];

      if (removeChat) {
        self._unreadItemRemoved(itemId);
      } else {
        // remove mention from chat
        self._mentionRemoved(itemId);
      }
    });
  },

  notifyCount: function() {
    this.trigger('newcountvalue', this.length);
  },

  getItems: function() {
    return Object.keys(this._items);
  },

  getItemHash: function() {
    return this._items;
  },

  getMentions: function() {
    return Object.keys(this._items).reduce(
      function(accum, itemId) {
        if (this._items[itemId]) accum.push(itemId);
        return accum;
      }.bind(this),
      []
    );
  },

  getLurkMode: function() {
    return this._lurkMode;
  },

  enableLurkMode: function() {
    this._lurkMode = true;
    this.markAllReadNotification();
  },

  disableLurkMode: function() {
    this._lurkMode = false;
  },

  markAllRead: function() {
    debug('markAllRead');
    var lurkMode = this._lurkMode;

    Object.keys(this._items).forEach(function(itemId) {
      var mention = this._items[itemId];

      // Notify that all are read
      this._read.add(itemId);
      this.trigger('itemMarkedRead', itemId, mention, lurkMode);
    }, this);

    this._items = {};
    this.length = 0;
    this.notifyCountLimited();
  },

  /* Realtime notification that everything was marked as read somewhere else */
  markAllReadNotification: function() {
    debug('markAllReadNotification');
    Object.keys(this._items).forEach(function(itemId) {
      // Notify that all are read
      this.trigger('unreadItemRemoved', itemId);
    }, this);

    this._items = {};
    this.length = 0;
    this.notifyCountLimited();
  },

  getFirstItem: function() {
    return Object.keys(this._items).reduce(function(memo, value) {
      /* min */
      if (memo === null) return value;
      return memo < value ? memo : value;
    }, null);
  },

  isMarkedAsRead: function(itemId) {
    return this._read.contains(itemId);
  },

  reset: function(items, lurking) {
    this.length = 0;
    this._lurkMode = !!lurking;
    this._read.reset();

    this._items = {};
    if (items) {
      this.state = 'LOADED';
      _iteratePreload(
        items,
        function(itemId, mention) {
          this._unreadItemAdded(itemId, mention, { silent: true });
        },
        this
      );

      this.trigger('reset');
      this.notifyCountLimited();
    } else {
      if (this.state === 'LOADED') this.notifyCountLimited();
    }
  }
});

module.exports = UnreadItemStore;
