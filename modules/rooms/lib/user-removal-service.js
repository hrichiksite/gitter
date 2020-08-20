'use strict';

var userService = require('gitter-web-users');
var troupeService = require('./troupe-service');
var roomService = require('./room-service');
var roomMembershipService = require('./room-membership-service');
var Promise = require('bluebird');
var debug = require('debug')('gitter:app:user-removal-service');
var identityService = require('gitter-web-identity');
const oauthService = require('gitter-web-oauth');

// eslint-disable-next-line max-statements
exports.removeByUsername = async function(username, options = {}) {
  const user = await userService.findByUsername(username);
  debug('Remove by username %s', username);
  if (!user) return;

  const userId = user.id;

  const troupeIds = await roomMembershipService.findRoomIdsForUser(userId);

  const troupes = await troupeService.findByIds(troupeIds);
  for (let troupe of troupes) {
    if (troupe.oneToOne) {
      await roomService.deleteRoom(troupe);
    } else {
      await roomService.removeUserFromRoom(troupe, user);
    }
  }

  if (options.deleteUser) {
    await user.remove();
  } else {
    user.state = 'REMOVED';
    user.email = undefined;
    user.invitedEmail = undefined;
    user.githubToken = null;
    user.githubScopes = {};
    user.githubUserToken = null;

    let whenIdentitiesRemoved = Promise.resolve();
    if (options.ghost) {
      user.username = `ghost~${user.id}`;
      user.displayName = 'Ghost';
      user.identities = [];
      user.emails = [];
      user.gravatarImageUrl = undefined;
      user.gravatarVersion = undefined;
      user.githubId = undefined;
      user.stripeCustomerId = undefined;
      user.tz = undefined;

      whenIdentitiesRemoved = identityService.removeForUser(user);
    }

    await Promise.all([user.save(), whenIdentitiesRemoved]);
  }

  await oauthService.removeAllAccessTokensForUser(userId);
};
