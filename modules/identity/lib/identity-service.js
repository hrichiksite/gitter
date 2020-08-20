'use strict';

var Promise = require('bluebird');
var Identity = require('gitter-web-persistence').Identity;
var assert = require('assert');
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');
var isGitHubUser = require('./is-github-user');
var GITHUB_PROVIDER_KEY = 'github';

/**
 * If a user is a github user, returns a fake identity
 */
function castUserAsGitHubIdentity(user) {
  if (isGitHubUser(user)) {
    return {
      provider: GITHUB_PROVIDER_KEY,
      providerKey: `${user.githubId}`,
      username: user.username,
      displayName: user.displayName,
      email: null,
      accessToken: user.githubUserToken,
      refreshToken: null,
      accessTokenSecret: null,
      upgradedAccessToken: user.githubToken,
      scopes: user.githubScopes,
      avatar: user.gravatarImageUrl
    };
  }

  return null;
}

/**
 * Given a user and a provider, returns an identity to the user
 * Returns the identity or null if the user doesn't have the
 * requested identity
 *
 * @return {Promise} Promise of the identity
 */
var getIdentityForUser = Promise.method(function(user, provider) {
  if (!user) return null;

  var cachedIdentities = user._cachedIdentities;

  if (!cachedIdentities) {
    cachedIdentities = user._cachedIdentities = {};
  } else if (cachedIdentities[provider]) {
    return cachedIdentities[provider];
  }

  var query = (cachedIdentities[provider] = findIdentityForUser(user, provider));
  return query;
});

/**
 * Given a user and a provider, returns an identity
 */
var findIdentityForUser = Promise.method(function(user, provider) {
  assert(provider, 'provider required');

  if (!user) return null;

  // Special case for GitHub, for now
  // in future, github will just use the same scheme as the other providers
  if (provider === GITHUB_PROVIDER_KEY) {
    return castUserAsGitHubIdentity(user);
  }

  return Identity.findOne({ userId: user._id, provider: provider }, { _id: 0, userId: 0, __v: 0 })
    .lean()
    .exec();
});

/**
 * List all the identities for a user

 * NOTE: At present this is unreliable for finding all the identities for a user,
 * because it doesn't contain any GitHub identities. In order to know if a user is
 * a GitHub user you can sorta get away with just the username at present, but you
 * really need (pretty much) the full user object to be sure and to get any useful
 * info out. So be careful.
 */
var listForUser = Promise.method(function(user) {
  if (!user) return [];

  if (isGitHubUser(user)) {
    return [castUserAsGitHubIdentity(user)];
  }

  if (user._cachedIdentityList) {
    // This is bad
    return user._cachedIdentityList;
  }

  var userId = user._id;

  var query = (user._cachedIdentityList = Identity.find(
    { userId: userId },
    { _id: 0, userId: 0, __v: 0 }
  )
    .lean()
    .exec());

  return query;
});

/**
 * For exporting things
 */
function getCursorByUserId(userId) {
  const cursor = Identity.find({
    userId
  })
    .lean()
    .read(mongoReadPrefs.secondaryPreferred)
    .batchSize(100)
    .cursor();

  return cursor;
}

/**
 * Returns a list of provider keys for a user
 *
 * NOTE: right now you can only have one identity and this takes advantage
 * of that, but in future this will have to be updated so it doesn't return
 * early and instead appends them together.
 * #github-uri-split #multiple-identity-user
 */
var listProvidersForUser = Promise.method(function(user) {
  if (!user) return [];

  if (isGitHubUser(user)) {
    return ['github'];
  }

  if (user._cachedIdentityList) {
    // This is bad
    return Object.keys(user._cachedIdentityList);
  }

  return Identity.distinct('provider', { userId: user._id }).exec();
});

/**
 * Given a provider, eg "twitter" and a username on that provider
 * attempts to find a user who has signed up those creds
 */
function findUserIdForProviderUsername(provider, username) {
  return Identity.findOne({ provider: provider, username: username }, { userId: 1, _id: 0 })
    .lean()
    .then(function(result) {
      return result && result.userId;
    });
}

/**
 * Returns the primary identity of a user
 */
function findPrimaryIdentityForUser(user) {
  // TODO: handle caching
  if (isGitHubUser(user)) {
    return castUserAsGitHubIdentity(user);
  }

  // TODO: handle multiple identities better, in future
  return Identity.findOne({ userId: user._id }, { _id: 0, userId: 0, __v: 0 })
    .lean()
    .exec()
    .then(function(identity) {
      if (!identity) {
        return castUserAsGitHubIdentity(user);
      }

      return identity;
    });
}

/**
 * Remove all the identities for a user
 */
var removeForUser = function(user) {
  assert(user);

  var userId = user._id;

  return Identity.remove({ userId: userId });
};

module.exports = {
  getIdentityForUser: getIdentityForUser,
  getCursorByUserId,
  listForUser: listForUser,
  listProvidersForUser: listProvidersForUser,
  findUserIdForProviderUsername: findUserIdForProviderUsername,
  findPrimaryIdentityForUser: Promise.method(findPrimaryIdentityForUser),
  removeForUser: Promise.method(removeForUser),

  GITLAB_IDENTITY_PROVIDER: 'gitlab',
  GITHUB_IDENTITY_PROVIDER: 'github',
  GOOGLE_IDENTITY_PROVIDER: 'google',
  TWITTER_IDENTITY_PROVIDER: 'twitter',
  LINKEDIN_IDENTITY_PROVIDER: 'linkedin'
};
