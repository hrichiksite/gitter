'use strict';

var Backbone = require('backbone');
var parsedQuery = require('gitter-web-qs/parse');
var _ = require('lodash');
var Promise = require('bluebird');
var clientEnv = require('gitter-client-env');
var debug = require('debug-proxy')('app:client-context');

var ctx = window.troupeContext || {};
var snapshots = ctx.snapshots || {};
debug('window.troupeContext', ctx);

function getGroupModel() {
  var groupData;
  if (ctx.group) {
    groupData = ctx.group;
  } else if (ctx.troupe && ctx.troupe.group) {
    groupData = ctx.troupe.group;
  }
  return new Backbone.Model(groupData);
}

function getTroupeModel() {
  var troupeModel;
  if (ctx.troupe) {
    troupeModel = ctx.troupe;
  } else if (ctx.troupeId) {
    troupeModel = { id: ctx.troupeId };
  } else if (parsedQuery.troupeId) {
    troupeModel = { id: parsedQuery.troupeId };
  }

  return new Backbone.Model(troupeModel);
}

function getUserModel() {
  var userModel;

  if (ctx.user) {
    userModel = ctx.user;
  } else if (ctx.userId) {
    userModel = { id: ctx.userId };
  }

  return new Backbone.Model(userModel);
}

function getContextModel(troupe, user) {
  var result = new Backbone.Model();
  result.set({ userId: user.id, troupeId: troupe.id });
  result.listenTo(user, 'change:id', function(user, newId) {
    // jshint unused:true
    result.set({ userId: newId });
  });

  result.listenTo(troupe, 'change:id', function(troupe, newId) {
    // jshint unused:true
    result.set({ troupeId: newId });
  });

  return result;
}

function getDelayedContextModel(contextModel, delay) {
  var result = new Backbone.Model();
  result.set({ userId: contextModel.get('userId'), troupeId: contextModel.get('troupeId') });

  var delayedUpdate = _.debounce(function() {
    result.set({ troupeId: contextModel.get('troupeId') });
  }, delay);

  result.listenTo(contextModel, 'change:userId', function(user, newId) {
    // jshint unused:true
    result.set({ userId: newId });
  });

  result.listenTo(contextModel, 'change:troupeId', function() {
    // Clear the troupeId...
    result.set({ troupeId: null });

    // ...and reset it after a period of time
    delayedUpdate();
  });

  return result;
}
var group = getGroupModel();
var troupe = getTroupeModel();
var user = getUserModel();
var contextModel = getContextModel(troupe, user);

var context = function() {
  return ctx;
};

context.group = function() {
  return group;
};

context.troupe = function() {
  return troupe;
};

context.getGroupId = function() {
  return group.id;
};

context.getTroupeId = function() {
  return troupe.id;
};

context.contextModel = function() {
  return contextModel;
};

context.delayedContextModel = function(delay) {
  return getDelayedContextModel(contextModel, delay);
};

function clearOtherAttributes(s, v) {
  Object.keys(v.attributes).forEach(function(key) {
    if (!s.hasOwnProperty(key)) {
      s[key] = null;
    }
  });

  return s;
}

/** TEMP - lets think of a better way to do this... */
context.setTroupeId = function(value) {
  troupe.set(clearOtherAttributes({ id: value }, troupe));
  return;
};

context.setTroupe = function(value) {
  if (value.group) {
    group.set(clearOtherAttributes(value.group, group));
  } else {
    debug('Troupe data contains no group: %j', value);
  }

  troupe.set(clearOtherAttributes(value, troupe));
};

context.getUserId = function() {
  return user.id;
};

context.setUser = function(value) {
  user.set(clearOtherAttributes(value, user));
};

context.isAuthed = function() {
  return !!user.id;
};

context.inTroupeContext = function() {
  return !!troupe.id;
};

context.inOneToOneTroupeContext = function() {
  if (!context.inTroupeContext()) return false;
  return !!troupe.get('oneToOne');
};

/**
 * DEPRECATED
 */
context.getUser = function() {
  return user.toJSON();
};

// Unlike getUser, this returns a backbone model
context.user = function() {
  return user;
};

context.hasProvider = provider => {
  return (
    user &&
    (user.get('providers') || []).some(p => {
      return p === provider;
    })
  );
};

/**
 * DEPRECATED
 */
context.getTroupe = function() {
  return troupe.toJSON();
};

context.popEvent = function(name) {
  var events = ctx.events;
  if (events) {
    var i = events.indexOf(name);
    if (i >= 0) {
      events.splice(i, 1);
      return true;
    }
  }
};

context.getAccessToken = Promise.method(function() {
  var iterations = 0;
  // This check is here so we can call `/api/private/sample-chats` anonymously from the homepage for the world map
  // This is mixed into the `clientEnv` from the handlebars templates. See homepage.hbs
  //
  // This is only used for the homepage.
  // When viewing a chat room NLI, users still have a token for the realtime connection and API calls
  if (clientEnv['anonymous']) {
    return;
  }

  function checkToken() {
    // This is a very rough first attempt
    var token = window.bearerToken || parsedQuery.bearerToken || ctx.accessToken;
    if (token) return token;

    iterations++;
    if (iterations > 50) {
      // Force a reload, but don't do it more than once a minute
      if (window.sessionStorage) {
        var forcedReload = parseInt(window.sessionStorage.getItem('forced_reload'), 10);
        if (forcedReload && Date.now() < forcedReload) {
          return;
        }

        window.sessionStorage.setItem('forced_reload', Date.now() + 60000);
      }

      window.location.reload(true);
      return;
    }

    return Promise.delay(100).then(checkToken);
  }

  return checkToken();
});

context.isLoggedIn = function() {
  // If we're in a context where one cannot be logged out...
  if (clientEnv['loggedIn']) return true;

  // TODO: this is not ideal. perhaps make this better
  return !!user.id;
};

context.isStaff = function() {
  return user.get('staff');
};

/**
 * @deprecated use Vuex root getter `isDisplayedRoomAdmin`
 */
context.isTroupeAdmin = function() {
  var permissions = troupe.get('permissions');
  if (!permissions) return false;
  return !!permissions.admin;
};

context.lang = function() {
  if (ctx.lang) return ctx.lang;
  var e = clientEnv['lang'];
  if (e) return e;
  return [window.navigator.language];
};

context.isRoomMember = function() {
  return troupe.get('roomMember');
};

context.testOnly = {
  resetTroupeContext: function(newContext) {
    ctx = newContext;
    troupe = getTroupeModel();
    user = getUserModel();
  }
};

// Has a feature been enabled?
context.hasFeature = function(featureName) {
  return ctx.features && ctx.features.indexOf(featureName) >= 0;
};

context.getFeatures = function() {
  return ctx.features || [];
};

context.getSnapshot = function(key) {
  var snapshot = snapshots[key];

  //cleanup
  delete snapshots[key];

  return snapshot;
};

context.roomHasWelcomeMessage = function() {
  return ctx.roomHasWelcomeMessage;
};

module.exports = context;
