'use strict';

var _ = require('lodash');
var context = require('gitter-web-client-context');
var appEvents = require('../utils/appevents');
var debug = require('debug-proxy')('app:unread-items-frame');

function limit(fn, context, timeout) {
  return _.throttle(_.bind(fn, context), timeout || 30, { leading: false });
}

// -----------------------------------------------------
// Counts all the unread items in a troupe collection and
// publishes notifications on changes
// -----------------------------------------------------

var TroupeUnreadNotifier = function(troupeCollection) {
  this._collection = troupeCollection;

  this._currentStoreValueChanged = _.bind(this._currentStoreValueChanged, this);
  context.troupe().on('change:id', _.bind(this._recount, this));

  this._recountLimited = limit(this._recount, this, 50);
  this._collection.on(
    'change:unreadItems change:mentions reset sync add remove destroy',
    this._recountLimited,
    this
  );

  this._recountLimited();
};

TroupeUnreadNotifier.prototype = {
  _currentStoreValueChanged: function() {
    this._recountLimited();
  },

  _recount: function() {
    function count(memo, troupe) {
      var c = troupe.get('unreadItems') + troupe.get('mentions');
      return memo + (c > 0 ? 1 : 0);
    }

    var c = this._collection;

    var newTroupeUnreadTotal = c.reduce(count, 0);

    var currentUnreadTotal;
    var currentTroupeId = context.getTroupeId();
    if (currentTroupeId) {
      currentUnreadTotal = c
        .filter(function(trp) {
          return trp.id === currentTroupeId;
        })
        .reduce(count, 0);
    } else {
      currentUnreadTotal = 0;
    }

    var counts = {
      overall: newTroupeUnreadTotal,
      current: currentUnreadTotal
    };

    debug(
      'troupeUnreadTotalChange: overall=%s, current=%s',
      newTroupeUnreadTotal,
      currentUnreadTotal
    );

    appEvents.trigger('troupeUnreadTotalChange', counts);
  }
};

var unreadItemsClient = {
  installTroupeListener: function(troupeCollection) {
    /* Store can be optional below */
    new TroupeUnreadNotifier(troupeCollection);
  }
};

// Mainly useful for testing
unreadItemsClient.TroupeUnreadNotifier = TroupeUnreadNotifier;

module.exports = unreadItemsClient;
