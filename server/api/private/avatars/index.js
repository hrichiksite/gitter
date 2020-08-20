'use strict';

var express = require('express');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var router = express.Router({ caseSensitive: true, mergeParams: true });
var fixMongoIdQueryParam = require('../../../web/fix-mongo-id-query-param');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var cdn = require('gitter-web-cdn');
var avatars = require('gitter-web-avatars');
var githubUserByUsernameVersioned = require('./github-user-by-username-versioned');
var githubUserByUsername = require('./github-user-by-username');
var gravatarByEmail = require('./gravatar-by-email');
var gravatarByHash = require('./gravatar-by-hash');
var twitterByIds = require('./twitter-by-ids');
const groupAvatars = require('gitter-web-groups/lib/group-avatars');
var userByUsername = require('./user-by-username');

var DEFAULT_SIZE = 128;
var MISSING_IMAGE_CONTENT_TYPE = 'image/png';

function sendMissing(req, res) {
  // If the nginx image proxy is sitting in front of the app
  // use that
  if (req.headers['x-avatar-server']) {
    res.set('X-Accel-Redirect', '/missing');
    res.set('Content-Type', MISSING_IMAGE_CONTENT_TYPE);
    res.status(200).end();
  } else {
    res.redirect(avatars.getDefault());
    res.status(200).end();
  }
}

function sendAvatar(callback) {
  return function(req, res, next) {
    return Promise.try(function() {
      var size = (req.query.s && parseInt(req.query.s, 10)) || DEFAULT_SIZE;
      return callback(req, size);
    })
      .then(function(response) {
        if (!response) {
          return sendMissing(req, res);
        }

        var url = response.url;
        var longTermCachable = response.longTermCachable;

        if (!url) {
          return sendMissing(req, res);
        }

        // If the nginx image proxy is sitting in front of the app
        // use that
        if (req.headers['x-avatar-server']) {
          if (longTermCachable) {
            res.set('X-Accel-Redirect', '/fetch_lt/' + url);
          } else {
            res.set('X-Accel-Redirect', '/fetch/' + url);
          }
          res.send('OK');
          return;
        }

        // No image proxy, in the development environment
        if (longTermCachable) {
          res.set('Cache-Control', 'max-age=2592000'); // TODO: add more here
        } else {
          res.set('Cache-Control', 'max-age=3600'); // TODO: add more here
        }

        res.redirect(url);
        return;
      })
      .catch(next);
  };
}

/**
 * Default for development environment
 */
router.get(
  '/default',
  identifyRoute('api-private-avatar-default'),
  sendAvatar(function(/*req, size*/) {
    return {
      url: cdn('images/default-avatar.png'),
      longTermCachable: true
    };
  })
);

/**
 * Group Avatars, by ID
 */
router.get(
  '/group/i/:groupId',
  identifyRoute('api-private-avatar-group-id'),
  sendAvatar(async (req, size) => {
    var groupId = fixMongoIdQueryParam(req.params.groupId);
    if (!groupId) return null;

    const avatarUrl = await groupAvatars.getAvatarUrlForGroupId(groupId, size);
    if (!avatarUrl) return null;

    return {
      url: avatarUrl,
      longTermCachable: false
    };
  })
);

/**
 * Group Avatars, by ID (versioned)
 */
router.get(
  '/group/iv/:version/:groupId',
  identifyRoute('api-private-avatar-group-id-versioned'),
  sendAvatar(async (req, size) => {
    // Ignore the version it's only used as a cache-buster
    var groupId = fixMongoIdQueryParam(req.params.groupId);
    if (!groupId) return null;

    const avatarUrl = await groupAvatars.getAvatarUrlForGroupId(groupId, size);
    if (!avatarUrl) return null;

    return {
      url: avatarUrl,
      longTermCachable: true
    };
  })
);

/* Case sensitive */
router.get(
  '/g/u/:username',
  identifyRoute('api-private-avatar-gitter-username'),
  sendAvatar(function(req, size) {
    var username = req.params.username;
    if (!username) return null;

    return userByUsername(username, size);
  })
);

router.get(
  '/gravatar/e/:email',
  identifyRoute('api-private-avatar-gravatar'),
  sendAvatar(function(req, size) {
    var email = req.params.email;
    if (!email) return null;

    return gravatarByEmail(email, size);
  })
);

router.get(
  '/gravatar/m/:md5',
  identifyRoute('api-private-avatar-checksum'),
  sendAvatar(function(req, size) {
    var md5 = req.params.md5;
    if (!md5) return null;

    return gravatarByHash(md5, size);
  })
);

router.get(
  '/tw/i/:id/:filename',
  identifyRoute('api-private-avatar-twitter'),
  // NOTE: it doesn't support a size param yet
  sendAvatar(function(req) {
    var id = req.params.id;
    var filename = req.params.filename;

    if (!id || !filename) return null;

    return twitterByIds(id, filename);
  })
);

router.get(
  '/gl/u/:username',
  identifyRoute('api-private-gitlab-username'),
  sendAvatar(function(req) {
    const { username } = req.params;
    if (!username) return null;

    // Gravatar or https://gitlab.com/uploads/-/system/user/avatar/:userid/avatar.png
    return request({
      method: 'GET',
      uri: 'https://gitlab.com/api/v4/users?username=' + encodeURIComponent(username),
      json: true
    }).then(res => {
      return {
        url: res.body.avatar_url,
        longTermCachable: false
      };
    });
  })
);

/**
 * Only used in DEV. Otherwise nginx handles this route
 */
router.get(
  '/gh/u/:username',
  identifyRoute('api-private-github-username'),
  sendAvatar(function(req, size) {
    var username = req.params.username;
    if (!username) return null;

    return githubUserByUsername(username, size);
  })
);

/**
 * Only used in DEV. Otherwise nginx handles this route
 */
router.get(
  '/gh/uv/:version/:username',
  identifyRoute('api-private-github-versioned-username'),
  sendAvatar(function(req, size) {
    var username = req.params.username;
    var version = req.params.version;
    if (!username) return null;

    if (!version) {
      return githubUserByUsername(username, size);
    }

    return githubUserByUsernameVersioned(username, version, size);
  })
);

/* Default route for anything else on the avatar server */
router.use(
  identifyRoute('api-private-missing-avatar'),
  sendAvatar(function() {
    return null;
  })
);

module.exports = router;
