'use strict';

var _ = require('lodash');
var Backbone = require('backbone');
var context = require('gitter-web-client-context');
var moment = require('moment');
var burstCalculator = require('../utils/burst-calculator');
var InfiniteCollectionMixin = require('./infinite-mixin');
var cocktail = require('backbone.cocktail');
var log = require('../utils/log');
var LiveCollection = require('gitter-realtime-client').LiveCollection;
var realtime = require('../components/realtime');
const isMobileEmbedded = require('../utils/is-mobile-embedded');
var SyncMixin = require('./sync-mixin');
var lookupParser = require('gitter-web-shared/lookup-parser');

var ChatModel = Backbone.Model.extend({
  idAttribute: 'id',
  initialize: function() {
    this.listenTo(this, 'sync', this.triggerSynced);
    this.listenTo(this, 'request', this.triggerSyncing);
    this.listenTo(this, 'error', this.triggerSyncError);

    /* When the chat is removed from the collection, stop listening to events */
    this.listenTo(this, 'remove', function() {
      this.stopListening(this);
    });
  },

  triggerSynced: function() {
    this._syncErrorTime = null;
    this.trigger('syncStatusChange', 'synced');
  },

  /* Gunter: Help! I am syncing! William: What are you syncing about? */
  triggerSyncing: function() {
    this.trigger('syncStatusChange', 'syncing');
  },

  triggerSyncError: function() {
    this._syncErrorTime = moment();
    this.trigger('syncStatusChange', 'syncerror');
  },

  parse: function(message) {
    if (message.sent) {
      message.sent = moment(message.sent, moment.defaultFormat);
    }

    if (message.editedAt) {
      message.editedAt = moment(message.editedAt, moment.defaultFormat);
    }

    // Check for the special case of messages from the current user
    if (message.unread && message.fromUser) {
      if (message.fromUser.id === context.getUserId()) {
        message.unread = false;
      }
    }

    return message;
  },

  toJSON: function() {
    //eslint-disable-next-line
    var d = _.clone(this.attributes);
    var sent = this.get('sent');
    if (sent) {
      // Turn the moment sent value into a string
      d.sent = sent.format();
    } else {
      delete d.sent;
    }

    delete d.burstStart;
    delete d.fromUser;
    // No need to send html back to the server
    delete d.html;

    return d;
  },

  hasSyncError: function() {
    return !!this._syncErrorTime;
  },

  sync: SyncMixin.sync
});

var ChatCollection = LiveCollection.extend({
  model: ChatModel,
  modelName: 'chat',
  client: function() {
    return realtime.getClient();
  },

  urlTemplate: '/v1/rooms/:troupeId/chatMessages',
  contextModel: context.contextModel(),
  comparator: function(c1, c2) {
    var s1 = c1.get('sent') || c1._syncErrorTime;
    var s2 = c2.get('sent') || c2._syncErrorTime;
    if (!s1) {
      if (!s2) return 0; // null === null
      return 1; // null > s2
    }

    if (!s2) return -1; // s1 < null
    return s1.valueOf() - s2.valueOf();
  },

  initialize: function() {
    this.listenTo(this, 'add', function(model, collection) {
      collection.once('sort', function() {
        burstCalculator.calc.call(this, model);
      });
    });

    this.listenTo(this, 'remove', function() {
      burstCalculator.parse(this);
    });

    this.listenTo(this, 'sync', function(model) {
      // Sync is for collections and models
      if (!(model instanceof Backbone.Model)) return;

      this.checkClientClockSkew(model);
    });

    this.listenTo(this, 'change:sent', function(model) {
      this.checkClientClockSkew(model);
    });

    this.listenTo(this, 'reset sync', function() {
      burstCalculator.parse(this);
    });

    //when we change room we want to reset the state
    this.listenTo(context.troupe(), 'change:id', function() {
      this.setAtTop(false);
    });
  },

  transformModel: function(model) {
    // If the incoming model is marked as read,
    // but the existing model is unread
    // ignore that part of the update
    if (model.unread) {
      var id = model.id;
      var existing = this.get(id);
      if (existing && existing.unread === false) {
        delete model.unread;
      }
    }

    return model;
  },

  getQuery: function() {
    // includeThreads is for inline-threads-for-mobile-embedded
    return { lookups: ['user'], includeThreads: isMobileEmbedded() };
  },

  getSnapshotExtras: function() {
    // includeThreads is for inline-threads-for-mobile-embedded
    return { lookups: ['user'], includeThreads: isMobileEmbedded() };
  },

  parse: function(collection) {
    if (collection.lookups) {
      var chats = lookupParser.parseChats(collection);
      return burstCalculator.parse(chats);
    } else {
      return burstCalculator.parse(collection);
    }
  },

  findModelForOptimisticMerge: function(newModel) {
    var optimisticModel = this.find(function(model) {
      return !model.id && model.get('text') === newModel.get('text');
    });

    return optimisticModel;
  },

  checkClientClockSkew: function(model) {
    var sent = model.attributes.sent;
    var previousSent = model.previousAttributes().sent;

    if (sent && previousSent) {
      var diff = sent.valueOf() - previousSent.valueOf();
      if (diff > 20000) {
        log.warn('Clock skew is ' + diff + 'ms');
      }
    }
  },

  sync: SyncMixin.sync
});
cocktail.mixin(ChatCollection, InfiniteCollectionMixin);

var ReadByModel = Backbone.Model.extend({
  idAttribute: 'id'
});

var ReadByCollection = LiveCollection.extend({
  model: ReadByModel,
  modelName: 'chatReadBy',
  client: function() {
    return realtime.getClient();
  },

  urlTemplate: '/v1/rooms/:troupeId/chatMessages/:chatId/readBy',
  contextModel: function() {
    // Note, this contextModel is not live
    return new Backbone.Model({ troupeId: context.getTroupeId(), chatId: this.chatMessageId });
  },

  initialize: function(models, options) {
    // jshint unused:true
    var userCollection = options.userCollection;
    if (userCollection) {
      this.transformModel = function(model) {
        var m = userCollection.get(model.id);
        if (m) return m.toJSON();

        // If the user is not in the user roster, this is broken.. need to lookup the user
        return model;
      };
    }

    this.chatMessageId = options.chatMessageId;
  },

  sync: SyncMixin.sync
});

module.exports = {
  ReadByModel: ReadByModel,
  ReadByCollection: ReadByCollection,
  ChatModel: ChatModel,
  ChatCollection: ChatCollection
};
