'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');
var isValidEmail = require('email-validator').validate;
var inviteValidation = require('gitter-web-invites/lib/invite-validation');
var invitesService = require('gitter-web-invites/lib/invites-service');
var BackendMuxer = require('gitter-web-backend-muxer');
var avatars = require('gitter-web-avatars');
var restSerializer = require('../../serializers/rest-serializer');

function getAvatar(userToInvite, type, externalId, emailAddress) {
  if (userToInvite) {
    return avatars.getForUser(userToInvite);
  } else {
    return inviteValidation.getAvatar(type, externalId, emailAddress);
  }
}

function _findEmailAddress(invitingUser, userToInvite, type, externalId, emailAddress) {
  if (emailAddress) {
    if (!isValidEmail(emailAddress)) {
      throw new StatusError(400);
    }

    return emailAddress;
  }

  if (userToInvite) {
    var backendMuxer = new BackendMuxer(userToInvite);
    return backendMuxer.getEmailAddress();
  } else {
    return invitesService.resolveEmailAddress(invitingUser, type, externalId);
  }
}

var findEmailAddress = Promise.method(_findEmailAddress);

function findInvitationInfo(invitingUser, type, externalId, emailAddress) {
  var userToInvite;
  return invitesService
    .findExistingUser(type, externalId)
    .then(function(_userToInvite) {
      userToInvite = _userToInvite;
      return findEmailAddress(invitingUser, userToInvite, type, externalId, emailAddress);
    })
    .then(function(resolvedEmailAddress) {
      if (!resolvedEmailAddress) throw new StatusError(428);

      return {
        user: userToInvite, // can be null/undefined
        displayName: (userToInvite && userToInvite.displayName) || externalId,
        emailAddress: resolvedEmailAddress,
        avatarUrl: getAvatar(invitingUser, type, externalId, resolvedEmailAddress)
      };
    });
}

function checkInvite(req, res, next) {
  var input = inviteValidation.parseAndValidateInput(req.query);
  return findInvitationInfo(req.user, input.type, input.externalId, input.emailAddress)
    .then(function(result) {
      if (!result.user) {
        return {
          displayName: result.displayName,
          avatarUrl: result.avatarUrl
        };
      }

      var strategy = new restSerializer.UserStrategy();
      return restSerializer.serializeObject(result.user, strategy).then(function(serializedUser) {
        return {
          user: serializedUser,
          displayName: result.displayName,
          avatarUrl: result.avatarUrl
        };
      });
    })
    .then(function(response) {
      res.send(response);
    })
    .catch(next);
}

module.exports = checkInvite;
