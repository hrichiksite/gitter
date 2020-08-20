'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');
var groupService = require('gitter-web-groups/lib/group-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var groupCreationService = require('../../../services/group-creation-service');
var inviteValidation = require('gitter-web-invites/lib/invite-validation');
var restful = require('../../../services/restful');
var restSerializer = require('../../../serializers/rest-serializer');
var internalClientAccessOnly = require('../../../web/middlewares/internal-client-access-only');

var MAX_BATCHED_INVITES = 100;

function getInvites(invitesInput) {
  if (!invitesInput || !invitesInput.length) return [];

  if (invitesInput.length > MAX_BATCHED_INVITES) {
    throw new StatusError(400, 'Too many batched invites.');
  }

  // This could throw, but it is the basic user-input validation that would
  // have failed if the frontend didn't call the invite checker API like it
  // should have anyway.
  return invitesInput.map(function(input) {
    return inviteValidation.parseAndValidateInput(input);
  });
}

function validateStringArray(input, errorMessage) {
  if (!input) return undefined;

  if (!Array.isArray(input)) throw new StatusError(400, errorMessage);

  var valuesAreStrings = input.every(function(s) {
    return typeof s === 'string';
  });

  if (valuesAreStrings) {
    return input;
  } else {
    throw new StatusError(400, errorMessage);
  }
}

function getGroupOptions(body) {
  var uri = body.uri ? String(body.uri) : undefined;
  var name = body.name ? String(body.name) : undefined;
  var defaultRoomName = body.defaultRoomName ? String(body.defaultRoomName) : undefined;
  var providers = validateStringArray(body.providers, 'Providers must be strings.');
  var invites = getInvites(body.invites);

  var groupOptions = {
    uri: uri,
    name: name,
    defaultRoom: {
      defaultRoomName: defaultRoomName,
      providers: providers,
      addBadge: !!body.addBadge
    },
    invites: invites,
    allowTweeting: body.allowTweeting
  };

  if (body.security) {
    // for GitHub and future group types that are backed by other services
    groupOptions.type = body.security.type ? String(body.security.type) : undefined;
    groupOptions.linkPath = body.security.linkPath ? String(body.security.linkPath) : undefined;
  }

  return groupOptions;
}

module.exports = {
  id: 'group',

  index: function(req) {
    if (!req.user) {
      throw new StatusError(401);
    }

    var lean = (req.query.lean && parseInt(req.query.lean, 10)) || false;

    if (req.query.type === 'admin') {
      return restful.serializeAdminGroupsForUser(req.user, { lean: lean });
    }

    return restful.serializeGroupsForUserId(req.user._id, { lean: lean });
  },

  create: function(req) {
    var user = req.user;

    // This is for internal clients only
    if (!internalClientAccessOnly.isRequestFromInternalClient(req)) {
      throw new StatusError(404);
    }

    if (!req.user) {
      throw new StatusError(401);
    }

    var groupCreationOptions = getGroupOptions(req.body);

    return groupCreationService(user, groupCreationOptions).then(function(groupCreationResult) {
      var group = groupCreationResult.group;
      var defaultRoom = groupCreationResult.defaultRoom;

      var groupStrategy = new restSerializer.GroupStrategy({
        currentUserId: req.user.id
      });
      var troupeStrategy = new restSerializer.TroupeStrategy({
        currentUserId: req.user.id,
        includeTags: true,
        includePermissions: true,
        includeBackend: true
      });

      return Promise.join(
        restSerializer.serializeObject(group, groupStrategy),
        restSerializer.serializeObject(defaultRoom, troupeStrategy),
        function(serializedGroup, serializedRoom) {
          serializedGroup.defaultRoom = serializedRoom;
          serializedGroup.hookCreationFailedDueToMissingScope =
            groupCreationResult.hookCreationFailedDueToMissingScope;
          return serializedGroup;
        }
      );
    });
  },

  update: function(req) {
    var group = req.group;
    var user = req.user;

    var promises = [];
    // Nothing to update on groups

    if (!promises.length) {
      throw new StatusError(400, 'Nothing to update.');
    }

    return Promise.all(promises).then(function() {
      var strategy = new restSerializer.GroupStrategy({
        currentUserId: user && user._id,
        currentUser: user
      });
      return restSerializer.serializeObject(group, strategy);
    });
  },

  show: function(req) {
    var group = req.group;
    var user = req.user;
    var userId = user && user._id;

    var strategy = new restSerializer.GroupStrategy({
      currentUserId: userId,
      currentUser: user
    });
    return restSerializer.serializeObject(group, strategy);
  },

  load: function(req, id) {
    return policyFactory
      .createPolicyForGroupId(req.user, id)
      .then(function(policy) {
        // TODO: middleware?
        req.userGroupPolicy = policy;

        return req.method === 'GET' ? policy.canRead() : policy.canWrite();
      })
      .then(function(access) {
        if (!access) return null;

        return groupService.findById(id, { lean: true });
      });
  },

  subresources: {
    rooms: require('./rooms'),
    suggestedRooms: require('./suggested-rooms'),
    security: require('./security')
  }
};
