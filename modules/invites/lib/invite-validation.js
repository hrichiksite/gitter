'use strict';

var StatusError = require('statuserror');
var identityService = require('gitter-web-identity');
var avatars = require('gitter-web-avatars');

/**
 * Hide the resolved email address from the caller
 */
function maskEmail(email) {
  return email
    .split('@')
    .map(function(item, index) {
      if (index === 0) {
        var gmailMagic = item.split('+')[0];
        return gmailMagic.slice(0, -8) + '****';
      }
      return item;
    })
    .join('@');
}

function validateIsString(value) {
  if (value && typeof value !== 'string') {
    throw new StatusError(400);
  }

  return value;
}

function parseAndValidateInput(input) {
  // Check for new cleaner method first...
  if (input.type) {
    if (!input.externalId) throw new StatusError(400);

    switch (input.type) {
      case 'email':
        return {
          type: input.type,
          externalId: input.emailAddress,
          emailAddress: input.emailAddress
        };

      case 'gitter':
      case identityService.GITHUB_IDENTITY_PROVIDER:
      case identityService.GITLAB_IDENTITY_PROVIDER:
      case identityService.TWITTER_IDENTITY_PROVIDER:
        return {
          type: input.type,
          externalId: input.externalId,
          emailAddress: input.emailAddress
        };
      default:
        throw new StatusError(400);
    }
  }

  // Older (crappier) method
  var types = {};

  function addUserIdentifer(identifier, key) {
    var value = input[key];
    if (!value) return;

    if (typeof value !== 'string') {
      throw new StatusError(400);
    }

    types[identifier] = value;
  }

  addUserIdentifer('gitter', 'username');
  addUserIdentifer(identityService.GITHUB_IDENTITY_PROVIDER, 'githubUsername');
  addUserIdentifer(identityService.GITLAB_IDENTITY_PROVIDER, 'gitlabUsername');
  // TODO: this doesn't actually work in the rest if the invites code
  addUserIdentifer(identityService.TWITTER_IDENTITY_PROVIDER, 'twitterUsername');

  var emailAddress = validateIsString(input.email);

  var keys = Object.keys(types);

  // You can't specify more than one username
  if (keys.length > 1) throw new StatusError(400);

  var type, externalId;

  if (keys.length) {
    // Provided the username from an external service, and
    // optionally an email address
    type = keys[0];
    externalId = types[type];
  } else {
    // No external username provided. Use the email address if it exists.
    if (!emailAddress) throw new StatusError(400);
    type = 'email';
    externalId = emailAddress;
  }

  return {
    type: type,
    externalId: externalId,
    emailAddress: emailAddress
  };
}

function getAvatar(type, externalId, resolvedEmailAddress) {
  // TODO: what about an arbitrary gitter user?

  if (type === identityService.GITHUB_IDENTITY_PROVIDER) {
    return avatars.getForGitHubUsername(externalId);
  }

  // TODO: what about a twitter user? At least one that has signed up.
  // TODO: what about a gitlab user? At least one that has signed up.

  if (resolvedEmailAddress) {
    return avatars.getForGravatarEmail(resolvedEmailAddress);
  }

  return avatars.getDefault();
}

module.exports = {
  parseAndValidateInput: parseAndValidateInput,
  // or should these be elsewhere?
  maskEmail: maskEmail,
  getAvatar: getAvatar
};
