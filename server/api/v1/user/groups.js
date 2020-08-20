'use strict';

var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var StatusError = require('statuserror');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var restful = require('../../../services/restful');
var restSerializer = require('../../../serializers/rest-serializer');

var groupService = require('gitter-web-groups/lib/group-service');

function performUpdateToUserGroup(req) {
  var user = req.user;
  if (!user) throw new StatusError(401);

  var userId = user._id;
  var groupId = req.params.userGroup;
  var updatedGroup = req.body;

  var promises = [];

  if ('favourite' in updatedGroup) {
    var fav = updatedGroup.favourite;

    promises.push(groupService.updateFavourite(userId, groupId, fav));
  }

  return Promise.all(promises).then(function() {
    if (req.accepts(['text', 'json']) === 'text') return;

    var strategy = new restSerializer.GroupIdStrategy({
      currentUserId: userId
    });

    return restSerializer.serializeObject(req.params.userGroup, strategy);
  });
}

module.exports = {
  id: 'userGroup',

  index: function(req) {
    if (!req.user) throw new StatusError(401);

    var lean = (req.query.lean && parseInt(req.query.lean, 10)) || false;

    if (req.query.type === 'admin') {
      return restful.serializeAdminGroupsForUser(req.user, { lean: lean });
    }

    return restful.serializeGroupsForUserId(req.user._id, { lean: lean });
  },

  load: function(req, id) {
    if (!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

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

  patch: function(req) {
    return performUpdateToUserGroup(req);
  }
};
