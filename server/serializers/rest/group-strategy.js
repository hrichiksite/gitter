'use strict';

var Promise = require('bluebird');
var avatars = require('gitter-web-avatars');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var SecurityDescriptorStrategy = require('./security-descriptor-strategy');
var FavouriteGroupsForUserStrategy = require('./favourite-groups-for-user-strategy');

function GroupStrategy(options) {
  this.options = options || {};

  var securityDescriptorStrategy;
  var favouriteStrategy;

  this.preload = function() {
    var options = this.options;
    var currentUserId = mongoUtils.asObjectID(options.currentUserId);
    var strategies = [];

    securityDescriptorStrategy = SecurityDescriptorStrategy.slim();

    if (currentUserId) {
      // Favourites for user
      favouriteStrategy = new FavouriteGroupsForUserStrategy({
        currentUserId: options.currentUserId
      });
      strategies.push(favouriteStrategy.preload());
    }

    return Promise.all(strategies);
  };

  this.map = function(group) {
    var options = this.options;
    var id = group.id || (group._id && group._id.toHexString());

    var hasAvatarSet = undefined;
    if (options.includeHasAvatarSet) {
      hasAvatarSet =
        group.avatarVersion > 0 ||
        group.sd.type === 'GH_ORG' ||
        group.sd.type === 'GH_REPO' ||
        group.sd.type === 'GH_USER';
    }

    return {
      id: id,
      name: group.name,
      uri: group.uri,
      favourite: favouriteStrategy ? favouriteStrategy.map(id) : undefined,
      homeUri: group.homeUri,
      backedBy: securityDescriptorStrategy.map(group.sd),
      avatarUrl: avatars.getForGroup(group),
      hasAvatarSet: hasAvatarSet
    };
  };
}

GroupStrategy.prototype = {
  name: 'GroupStrategy'
};

module.exports = GroupStrategy;
