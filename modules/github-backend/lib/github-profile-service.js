'use strict';

var Mirror = require('gitter-web-github').GitHubMirrorService('user');

// TODO: why on earth is this using the mirror service and
// not the user service? @lerouxb

module.exports = function gitHubProfileService(gitHubUser, options) {
  options = options || {};
  var gitHubUri = 'users/' + gitHubUser.username;

  // erm. This uses the user we're looking up's tokens, not the user requesting
  // the lookup.
  var mirror = new Mirror(gitHubUser);

  return mirror.get(gitHubUri).then(function(body) {
    if (!body || !body.login) return;

    var blogUrl;
    if (body.blog) {
      if (body.blog.match(/^https?:\/\//)) {
        blogUrl = body.blog;
      } else {
        blogUrl = 'http://' + body.blog;
      }
    }

    var profile = {};

    // core fields are only useful if we aren't using what's already in our
    // db for those values
    if (options.includeCore) {
      profile.username = body.login;
      profile.displayName = body.name;
    }

    //standard
    profile.company = body.company;
    profile.location = body.location;
    profile.email = body.email;
    profile.website = blogUrl;
    profile.profile = body.html_url;

    // For gitter users we use what's in the db, but for github users that
    // aren't, we have to use what github returns.
    profile.gravatarImageUrl = body.avatar_url;

    // github-specific
    profile.github = {
      followers: body.followers,
      public_repos: body.public_repos,
      following: body.following
    };

    return profile;
  });
};
