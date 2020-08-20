'use strict';

const { iterableFromMongooseCursor } = require('gitter-web-persistence-utils/lib/mongoose-utils');
const restSerializer = require('../../serializers/rest-serializer');
const LastTroupeAccessTimesForUserStrategy = require('../../serializers/rest/troupes/last-access-times-for-user-strategy');
const RoomInviteStrategy = require('../../serializers/rest/troupes/room-invite-strategy');
const RoomRemovedUserStrategy = require('../../serializers/rest/troupes/room-removed-user-strategy');

const generateExportResource = require('./generate-export-resource');
const identityService = require('gitter-web-identity');
const chatService = require('gitter-web-chats');
const userSettingsService = require('gitter-web-user-settings');
const groupMembershipService = require('gitter-web-groups/lib/group-membership-service');
const groupFavouritesCore = require('gitter-web-groups/lib/group-favourites-core');
const roomFavouritesCore = require('gitter-web-rooms/lib/room-favourites-core');
const roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
const recentRoomCore = require('gitter-web-rooms/lib/recent-room-core');
const invitesService = require('gitter-web-invites');
const removedUsers = require('gitter-web-rooms/lib/room-removed-user-core');
const pushNotificationService = require('gitter-web-push-notifications');
const uriLookupService = require('gitter-web-uri-resolver/lib/uri-lookup-service');
const billingService = require('../../services/billing-service');
const knownExternalAccessService = require('gitter-web-permissions/lib/known-external-access/known-external-access-service');
const fingerprintingService = require('gitter-web-fingerprinting/lib/fingerprinting-service');
const oauthService = require('gitter-web-oauth');

const apiUserResource = require('../../api/v1/user');

const userResource = {
  id: 'user',
  load: apiUserResource.load,
  subresources: {
    'me.ndjson': generateExportResource('user-data', {
      getIterable: req => {
        return [req.user];
      },
      getStrategy: () => {
        return new restSerializer.UserStrategy();
      }
    }),
    'user-settings.ndjson': generateExportResource('user-settings', {
      getIterable: req => {
        return iterableFromMongooseCursor(userSettingsService.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.UserSettingsStrategy();
      }
    }),
    'identities.ndjson': generateExportResource('user-identites', {
      getIterable: req => {
        return iterableFromMongooseCursor(identityService.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.UserStrategy();
      }
    }),
    'group-favourites.ndjson': generateExportResource('user-group-favourites', {
      getIterable: req => {
        return iterableFromMongooseCursor(groupFavouritesCore.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.UserGroupFavouritesStrategy();
      }
    }),
    'admin-groups.ndjson': generateExportResource('user-admin-groups', {
      getIterable: req => {
        return groupMembershipService.findAdminGroupsForUser(req.user);
      },
      getStrategy: req => {
        return new restSerializer.GroupStrategy({
          currentUserId: req.user.id,
          currentUser: req.user
        });
      }
    }),
    'room-favourites.ndjson': generateExportResource('user-room-favourites', {
      getIterable: req => {
        return iterableFromMongooseCursor(roomFavouritesCore.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.UserRoomFavouritesStrategy();
      }
    }),
    'rooms.ndjson': generateExportResource('user-rooms', {
      getIterable: req => {
        return roomMembershipService.findRoomIdsForUser(req.user.id);
      },
      getStrategy: req => {
        return new restSerializer.TroupeIdStrategy({
          currentUserId: req.user.id,
          currentUser: req.user,
          skipUnreadCounts: true,
          includePremium: false
        });
      }
    }),
    'room-last-access-times.ndjson': generateExportResource('user-room-last-access-times', {
      getIterable: async req => {
        return Object.keys(
          await recentRoomCore.getTroupeLastAccessTimesForUserExcludingHidden(req.user.id)
        );
      },
      getStrategy: req => {
        return new LastTroupeAccessTimesForUserStrategy({
          currentUserId: req.user.id
        });
      }
    }),
    'room-invites.ndjson': generateExportResource('user-room-invites', {
      getIterable: async req => {
        return iterableFromMongooseCursor(invitesService.getInvitesCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new RoomInviteStrategy();
      }
    }),
    'room-sent-invites.ndjson': generateExportResource('user-room-sent-invites', {
      getIterable: async req => {
        return iterableFromMongooseCursor(invitesService.getSentInvitesCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new RoomInviteStrategy();
      }
    }),
    'room-removed-users.ndjson': generateExportResource('user-room-removed-users', {
      getIterable: async req => {
        return iterableFromMongooseCursor(removedUsers.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new RoomRemovedUserStrategy();
      }
    }),
    'messages.ndjson': generateExportResource('user-messages', {
      getIterable: async req => {
        return iterableFromMongooseCursor(chatService.getCursorByUserId(req.user.id));
      },
      getStrategy: req => {
        // Serialize the user once and re-use it for all of the users' messages
        const userStrategy = new restSerializer.UserStrategy();
        const serializedUser = restSerializer.serializeObject(req.user, userStrategy);

        return new restSerializer.ChatStrategy({
          user: serializedUser
        });
      }
    }),
    'push-notification-devices.ndjson': generateExportResource('user-push-notification-devices', {
      getIterable: async req => {
        return iterableFromMongooseCursor(pushNotificationService.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.PushNotificationDeviceStrategy();
      }
    }),
    'uri-lookups.ndjson': generateExportResource('user-uri-lookups', {
      getIterable: async req => {
        return iterableFromMongooseCursor(uriLookupService.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.UriLookupStrategy();
      }
    }),
    'subscriptions.ndjson': generateExportResource('user-subscriptions', {
      getIterable: async req => {
        return iterableFromMongooseCursor(billingService.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.SubscriptionStrategy();
      }
    }),
    'known-external-access.ndjson': generateExportResource('user-known-external-access', {
      getIterable: async req => {
        return iterableFromMongooseCursor(
          knownExternalAccessService.getCursorByUserId(req.user.id)
        );
      },
      getStrategy: () => {
        return new restSerializer.KnownExternalAccessStrategy();
      }
    }),
    'fingerprints.ndjson': generateExportResource('user-fingerprints', {
      getIterable: async req => {
        return iterableFromMongooseCursor(fingerprintingService.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.FingerprintStrategy();
      }
    }),
    'oauth-clients.ndjson': generateExportResource('user-oauth-clients', {
      getIterable: async req => {
        return iterableFromMongooseCursor(oauthService.getOAuthClientCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.OauthClientStrategy();
      }
    }),
    'oauth-access-tokens.ndjson': generateExportResource('user-oauth-access-tokens', {
      getIterable: async req => {
        return iterableFromMongooseCursor(
          oauthService.getOAuthAccessTokenCursorByUserId(req.user.id)
        );
      },
      getStrategy: () => {
        return new restSerializer.OauthAccessTokenStrategy();
      }
    })
  }
};

module.exports = userResource;
