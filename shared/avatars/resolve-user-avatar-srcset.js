'use strict';

var hash = require('./hash-avatar-to-cdn');
var DEFAULT_AVATAR_URL = 'https://avatars1.githubusercontent.com/u/0';
var parse = require('url-parse');

function defaultAvatarForSize(size) {
  return {
    src: DEFAULT_AVATAR_URL + '?s=' + size,
    size: size,
    srcset: DEFAULT_AVATAR_URL + '?s=' + size * 2 + ' 2x'
  };
}

function getAliasForSizeFromHostname(hostname) {
  // This might have to get more granular than just per-hostname in future if
  // they go through different versioning schemes. It also might be a path
  // component rather than a query string parameter. Will rethink once we get
  // there.

  if (hostname.indexOf('google') !== -1) {
    return 'sz';
  }

  // github uses s and we assume that's a good default
  return 's';
}

function getTwitterUrlForSize(url, size) {
  // NOTE: This mutates url, then changes it back again so we don't have to
  // parse it again as a way to make a copy.
  var oldPathname = url.pathname;

  // by default twitter profile pic urls end with _normal.[extension]
  var substring;
  if (size <= 24) {
    substring = '_mini';
  } else if (size <= 48) {
    substring = '_normal';
  } else if (size <= 73) {
    substring = '_bigger';
  } else {
    // original (but is it always square?)
    substring = '';
  }
  url.pathname = url.pathname.replace('_normal', substring);

  var newUrl = url.toString();

  // restore url to the original state
  url.pathname = oldPathname;

  return newUrl;
}

function getSrcSetForTwitterUrl(url, options) {
  return {
    src: getTwitterUrlForSize(url, options.srcSize),
    size: options.size,
    srcset: getTwitterUrlForSize(url, options.size * 2) + ' 2x'
  };
}

function getSrcSetForLinkedInUrl(url, options) {
  // TODO: doesn't look like linkedin profile pics are resizable, so just send the
  // originals for now
  return {
    src: url.toString(),
    size: options.size,
    srcset: url + ' 2x'
  };
}

function getSrcSetForDefaultUrl(url, options) {
  var attr = getAliasForSizeFromHostname(url.hostname);

  url.query[attr] = options.srcSize;
  var src = url.toString();

  url.query[attr] = options.size * 2;
  var srcset = url.toString() + ' 2x';

  return {
    src: src,
    size: options.size,
    srcset: srcset
  };
}

function srcSetForUser(user, size) {
  // required: user.gravatarImageUrl
  // optional: user.username (for github round-robin)

  // NOTE: url parsing should only happen server-side because client-side the
  // browser will just use avatarUrlSmall (if it is set by the serializer
  // strategy) without going through this again.
  var url = parse(user.gravatarImageUrl, true);
  if (!url) return defaultAvatarForSize(size);

  // try and do the same hashing to pull from different subdomains
  if (url.hostname.indexOf('github') !== -1 && user.username) {
    url.set('hostname', 'avatars' + hash(user.username) + '.githubusercontent.com');
  }

  var options = {
    // the size that was asked for
    size: size,
    // the size that we'll be asking the underlying code for,
    // possibly different from size due to the native android hack
    srcSize: size
  };

  if (typeof window !== 'undefined') {
    // fallback for retina displays without srcset support (e.g native android webviews)
    options.srcSize = size * (window.devicePixelRatio || 1); // eslint-disable-line no-undef
  }

  if (url.hostname === 'pbs.twimg.com') {
    return getSrcSetForTwitterUrl(url, options);
  } else if (url.hostname === 'media.licdn.com') {
    return getSrcSetForLinkedInUrl(url, options);
  } else {
    return getSrcSetForDefaultUrl(url, options);
  }
}

function buildAvatarUrlForUsername(username, version, size) {
  // This is the old fallback method that just sticks a username in there.

  if (username.indexOf('_') === -1) {
    // github namespace
    return (
      'https://avatars' +
      hash(username) +
      '.githubusercontent.com/' +
      username +
      '?' +
      (version ? 'v=' + version : '') +
      '&s=' +
      size
    );
  } else {
    // not github, send to resolver
    return '/api/private/user-avatar/' + username + '?s=' + size;
  }
}

module.exports = function resolveUserAvatarSrcSet(user, size) {
  // NOTE: user could just be a serialised partial bit of json

  size = size || 60;

  if (user) {
    if (user.avatarUrlSmall) {
      // Don't recalculate it if we already have it. The problem this poses is
      // that avatarUrlSmall is just a single value, not srcset, so we gotta
      // hack it a bit.
      return {
        src: user.avatarUrlSmall.replace('=60', '=' + size),
        size: size,
        srcset: user.avatarUrlSmall.replace('=60', '=' + size * 2) + ' 2x'
      };
    } else if (user.gravatarImageUrl) {
      // straight outta the db, so figure out what parameter to add
      return srcSetForUser(user, size);
    } else if (user.username) {
      // fall back to the username method
      var version = user.gravatarVersion || user.gv; // or undefined
      return {
        src: buildAvatarUrlForUsername(user.username, version, size),
        size: size,
        srcset: buildAvatarUrlForUsername(user.username, version, size * 2) + ' 2x'
      };
    }
  }

  // default: best we can do
  return defaultAvatarForSize(size);
};
