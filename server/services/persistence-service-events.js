'use strict';

var liveCollections = require('gitter-web-live-collection-events');

exports.install = function(persistenceService) {
  var schemas = persistenceService.schemas;
  var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');

  /**
   * Users
   */
  mongooseUtils.attachNotificationListenersToSchema(schemas.UserSchema, {
    listenPaths: ['displayName', 'username', 'gravatarVersion', 'gravatarImageUrl', 'state'],
    // ignoredPaths: ['lastTroupe','confirmationCode','status','passwordHash','passwordResetCode'],
    onUpdate: function onUserUpdate(model, next) {
      liveCollections.users.emit('update', model);
      next();
    }

    // TODO: deal with user deletion!
  });

  /**
   * Chats
   */
  mongooseUtils.attachNotificationListenersToSchema(schemas.ChatMessageSchema, {
    onCreate: function(model, next) {
      liveCollections.chats.emit('create', model);
      next();
    },

    onUpdate: function(model, next) {
      liveCollections.chats.emit('update', model);
      next();
    },

    onRemove: function(model) {
      liveCollections.chats.emit('remove', model);
    }
  });

  /**
   * Events
   */
  mongooseUtils.attachNotificationListenersToSchema(schemas.EventSchema, {
    onCreate: function(model, next) {
      liveCollections.events.emit('create', model);
      next();
    },

    onUpdate: function(model, next) {
      liveCollections.events.emit('update', model);
      next();
    },

    onRemove: function(model) {
      liveCollections.events.emit('remove', model);
    }
  });

  /**
   * Troupes
   */
  mongooseUtils.attachNotificationListenersToSchema(schemas.TroupeSchema, {
    listenPaths: ['uri', 'lcUri', 'githubType', 'topic', 'security'],
    // No create for now. We call the event manually
    // onCreate: function(model, next) {
    //   return liveCollections.rooms.emit('create', model)
    //     .catch(catchLogError)
    //     .nodeify(next);
    // },
    onUpdate: function(model, next) {
      liveCollections.rooms.emit('update', model);
      next();
    },

    onRemove: function(model) {
      liveCollections.rooms.emit('remove', model);
    }
  });
};
