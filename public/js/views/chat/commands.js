'use strict';

var _ = require('lodash');
var context = require('gitter-web-client-context');
var appEvents = require('../../utils/appevents');
var apiClient = require('../../components/api-client');
var unreadItemsClient = require('../../components/unread-items-client');

function updateNotifications(mode) {
  apiClient.userRoom.put('/settings/notifications', { mode: mode }).then(function() {
    appEvents.triggerParent('user_notification', {
      title: 'Notifications',
      text: 'Notification settings have been updated for this room'
    });
  });
}

const mentionRegexp = `@([\\w\\-.]+)`;

var commandsList = [
  {
    command: 'ban @username',
    description: 'Ban somebody from the room.',
    criteria: function() {
      var isOrgRoom = false;
      if (context.troupe().get('githubType') == 'ORG') isOrgRoom = true;
      return !context.inOneToOneTroupeContext() && context.isTroupeAdmin() && !isOrgRoom;
    },
    completion: 'ban @',
    regexp: /^\/ban/,
    action: function(text) {
      const userMatch = text.match(new RegExp(`\\/ban ${mentionRegexp}(\\s+(removemsgs))?`));
      if (!userMatch) return;
      var user = userMatch[1];
      var removeMessages = !!userMatch[3];

      apiClient.room
        .post('/bans', { username: user, removeMessages: removeMessages })
        .catch(function(e) {
          var errorMessage;
          switch (e.status) {
            case 403:
              errorMessage = 'You do not have permission to ban people.';
              break;

            case 400:
              errorMessage = e.friendlyMessage || 'Ban failed';
              break;

            case 404:
              errorMessage = 'That person does not exist (on Gitter that is)';
              break;
            default:
              errorMessage = 'Ban failed';
          }

          appEvents.triggerParent('user_notification', {
            title: 'Could not ban user',
            text: errorMessage,
            className: 'notification-error'
          });
        });
    }
  },
  {
    command: 'channel',
    description: 'Create/join a channel',
    completion: 'channel ',
    regexp: /^\/channel/,
    action: function(text) {
      var channelMatch = text.match(/^\s*\/channel(?:\s+([\w-]+))?/);
      var channel = channelMatch[1];

      if (channel) {
        appEvents.trigger('route', 'createroom/' + channel);
      } else {
        appEvents.trigger('route', 'createroom');
      }
    }
  },
  {
    command: 'fav',
    description: 'Toggle the room as a favourite',
    completion: 'fav ',
    regexp: /^\/fav\s*$/,
    action: function() {
      var isFavourite = !context.troupe().get('favourite');

      apiClient.userRoom.put('', { favourite: isFavourite });
    }
  },
  {
    command: 'leave',
    description: 'Leave the room',
    completion: 'leave ',
    regexp: /^\/(leave|part)\s*$/,
    criteria: function() {
      return !context.inOneToOneTroupeContext();
    },
    action: function() {
      context.troupe().set('aboutToLeave', true);
      apiClient.room.delete('/users/' + context.getUserId(), {}).then(function() {
        appEvents.trigger('navigation', '/home', 'home', '');
        context.troupe().set('roomMember', false);
      });
    }
  },
  {
    command: 'me',
    description: "Let people know what's happening",
    completion: 'me ',
    regexp: /^\/me/
  },
  {
    command: 'query @username',
    description: 'Have a private conversation with @username',
    completion: 'query @',
    regexp: /^\/query/,
    action: function(text) {
      const userMatch = text.match(new RegExp(`\\/query ${mentionRegexp}`));
      if (!userMatch) return;
      var user = userMatch[1];

      var url = '/' + user;
      var type = user === context.user().get('username') ? 'home' : 'chat';
      var title = user;

      appEvents.trigger('navigation', url, type, title);
    }
  },
  {
    command: 'remove @username',
    description: 'Remove somebody from the room',
    criteria: function() {
      return !context.inOneToOneTroupeContext() && context.isTroupeAdmin();
    },
    completion: 'remove @',
    regexp: /^\/remove/,
    action: function(text) {
      const userMatch = text.match(new RegExp(`\\/remove ${mentionRegexp}`));
      if (!userMatch) return;
      var user = userMatch[1];
      appEvents.trigger('command.room.remove', user);
    }
  },
  {
    command: 'subst',
    regexp: /^s\/([^\/]+)\/([^\/]*)\/i?(g?)\s*$/,
    action: function(text) {
      var re = this.regexp.exec(text);
      var search = re[1];
      var replace = re[2];
      var global = !!re[3];
      appEvents.trigger(
        'chatCollectionView:substLastChat',
        context.getUserId(),
        search,
        replace,
        global
      );
    }
  },
  {
    command: 'topic foo',
    description: 'Set room topic to foo',
    criteria: function() {
      return !context.inOneToOneTroupeContext() && context.isTroupeAdmin();
    },
    completion: 'topic ',
    regexp: /^\/topic/,
    action: function(text) {
      var topicMatch = text.match(/^\/topic (.+)/);
      if (topicMatch) {
        var topic = topicMatch[1];

        context.troupe().set('topic', topic);

        apiClient.room.put('', { topic: topic });
      }
    }
  },
  {
    command: 'unban @username',
    description: 'Unban somebody from the room',
    criteria: function() {
      var isOrgRoom = false;
      if (context.troupe().get('githubType') == 'ORG') isOrgRoom = true;
      return !context.inOneToOneTroupeContext() && context.isTroupeAdmin() && !isOrgRoom;
    },
    completion: 'unban @',
    regexp: /^\/unban/,
    action: function(text) {
      const userMatch = text.match(new RegExp(`\\/unban ${mentionRegexp}`));
      if (!userMatch) return;
      var user = userMatch[1];

      apiClient.room.delete('/bans/' + user, {}).catch(function(e) {
        var errorMessage;
        switch (e.status) {
          case 403:
            errorMessage = 'You do not have permission to unban people.';
            break;

          case 400:
            errorMessage = e.friendlyMessage || 'Unban failed';
            break;

          case 404:
            errorMessage = 'That person is not on the banned list.';
            break;
          default:
            errorMessage = 'Unban failed';
        }

        appEvents.triggerParent('user_notification', {
          title: 'Could not unban user',
          text: errorMessage,
          className: 'notification-error'
        });
      });
    }
  },
  {
    command: 'notify-all',
    description: 'Get notified on all messages',
    completion: 'notify-all',
    regexp: /^\/notify-all\s*$/,
    action: function() {
      updateNotifications('all');
    }
  },
  {
    command: 'notify-announcements',
    description: 'Get notified on mentions and group messages',
    completion: 'notify-announcements',
    regexp: /^\/notify-announcements\s*$/,
    action: function() {
      updateNotifications('announcement');
    }
  },
  {
    command: 'notify-mute',
    description: 'Mute all notifications, except direct mentions',
    completion: 'notify-mute',
    regexp: /^\/notify-mute\s*$/,
    action: function() {
      updateNotifications('mute');
    }
  },

  {
    command: 'mark-all-read',
    description: 'Mark all chat items as read',
    completion: 'mark-all-read',
    regexp: /^\/mark-all-read\s*$/,
    action: function() {
      unreadItemsClient.markAllRead();
    }
  },

  // Hidden Commands
  {
    command: 'update-default-mode',
    description: 'Update default mode for rooms',
    completion: 'update-default-mode',
    regexp: /^\/update-default-mode\b/,
    hidden: true,
    // regexp: /^\/mark-all-read\s*$/,
    action: function(text) {
      var topicMatch = text.match(/^\/update-default-mode\s+(all|annoucement|mute)(\s+override)?/);
      if (!topicMatch) return;

      var override = !!topicMatch[2];

      apiClient.user.put('/settings/defaultRoomMode', { mode: topicMatch[1], override: override });
    }
  }
];

module.exports = {
  size: commandsList.length,

  getSuggestions: function(term) {
    return commandsList.filter(function(cmd) {
      var elligible = !cmd.hidden && (!cmd.criteria || cmd.criteria()) && cmd.completion;
      return elligible && cmd.command.indexOf(term) === 0;
    });
  },

  findMatch: function(text) {
    return _.find(commandsList, function(cmd) {
      return text.match(cmd.regexp);
    });
  }
};
