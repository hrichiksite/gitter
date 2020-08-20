'use strict';

var _ = require('lodash');
var BackendMuxer = require('gitter-web-backend-muxer');

function UserProfileStrategy(/* options */) {
  var user;
  var profileResults;

  this.preload = function(users) {
    var length = users.size();
    if (length === 0) return;
    if (length !== 1) {
      throw new Error('User profile serializer can only load a single profile at a time');
    }

    user = users.first();
    var backendMuxer = new BackendMuxer(user);
    return backendMuxer.findProfiles(profileResults).then(function(profiles) {
      profileResults = profiles;
      // cache the profiles so we can get them out later.
      // (is this the best variable name?)

      // A hash would probably we better for this
      user.profiles = profiles;
    });
  };

  this.map = function(_user) {
    if (user !== _user) return;

    var profile = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      removed: user.state === 'REMOVED' || undefined, // isRemoved?
      has_gitter_login: true // by definition
    };

    // Provider is just the one that matched and we prefer the avatar in the
    // database over what's coming from the API so that it is easier to reuse
    // gravatarVersion for github users.
    _.extend(profile, _.omit(user.profiles[0], ['provider', 'gravatarImageUrl']));

    if (user.gravatarVersion) {
      // github
      profile.gv = user.gravatarVersion;
    } else {
      // non-github
      profile.gravatarImageUrl = user.gravatarImageUrl;
    }

    return profile;
  };
}

UserProfileStrategy.prototype = {
  name: 'UserProfileStrategy'
};

module.exports = UserProfileStrategy;
