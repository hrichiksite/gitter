'use strict';

var renderChat = require('./chat-internal');
var roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');

function renderSecondaryView(req, res, next, options) {
  var uriContext = options.uriContext;
  var troupe = uriContext.troupe;

  if (!troupe) return next('route');

  roomMembershipService
    .countMembersInRoom(req.troupe._id)
    .then(function(userCount) {
      const baseOptions = {
        embedded: true,
        uriContext: req.uriContext,
        classNames: ['embedded'],
        fetchEvents: false,
        fetchUsers: false,
        extras: {
          usersOnline: userCount
        }
      };

      if (req.user) {
        return renderChat(req, res, next, {
          ...baseOptions,
          template: 'chat-embed-template',
          script: 'router-embed-chat'
        });
      } else {
        return renderChat(req, res, next, {
          ...baseOptions,
          template: 'chat-nli-embed-template',
          script: 'router-nli-embed-chat'
        });
      }
    })
    .catch(next);
}

module.exports = {
  renderSecondaryView: renderSecondaryView
};
