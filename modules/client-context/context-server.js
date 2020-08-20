'use strict';

const Promise = require('bluebird');

const ctx = {};

const context = function() {
  return ctx;
};

context.group = function() {};

context.troupe = function() {};

context.getGroupId = function() {};

context.getTroupeId = function() {};

context.contextModel = function() {};

context.delayedContextModel = function() {};

context.setTroupeId = function() {};

context.setTroupe = function() {};

context.getUserId = function() {};

context.setUser = function() {};

context.isAuthed = function() {};

context.inTroupeContext = function() {};

context.inOneToOneTroupeContext = function() {};

context.getUser = function() {};

context.user = function() {};

context.hasProvider = function() {};

context.getTroupe = function() {};

context.popEvent = function() {};

context.getAccessToken = Promise.method(function() {});

context.isLoggedIn = function() {};

context.isStaff = function() {};

context.isTroupeAdmin = function() {};

context.lang = function() {};

context.isRoomMember = function() {};

context.testOnly = {};

context.hasFeature = function() {};

context.getFeatures = function() {};

context.getSnapshot = function() {};

context.roomHasWelcomeMessage = function() {};

module.exports = context;
