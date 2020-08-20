'use strict';

var Backbone = require('backbone');
var context = require('gitter-web-client-context');
var apiClient = require('../components/api-client');
var presentPermissionsDialog = require('../ensured/present-permissions-dialog');

function showWelcomeMessage() {
  var dialogRegion = this.dialogRegion;

  require.ensure(['../views/modals/welcome-message'], function(require) {
    var WelcomeMessageView = require('../views/modals/welcome-message');
    dialogRegion.show(new WelcomeMessageView.Modal());
  });
}

function createRoutes(options) {
  var rosterCollection = options.rosterCollection;

  return {
    autojoin: function() {
      if (context.roomHasWelcomeMessage()) {
        showWelcomeMessage.call(this);
        return;
      }

      apiClient.user
        .post('/rooms', { id: context.troupe().id })
        .bind(this)
        .then(function(body) {
          context.setTroupe(body);
        });
    },

    people: function() {
      var dialogRegion = this.dialogRegion;
      require.ensure(['../views/modals/people-modal'], function(require) {
        var PeopleModal = require('../views/modals/people-modal');

        dialogRegion.show(
          new PeopleModal({
            rosterCollection: rosterCollection
          })
        );
      });
    },

    notifications: function() {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/modals/notification-settings-view'], function(require) {
        var NotificationSettingsView = require('../views/modals/notification-settings-view');
        dialogRegion.show(new NotificationSettingsView({ model: new Backbone.Model() }));
      });
    },

    markdown: function() {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/modals/markdown-view'], function(require) {
        var MarkdownView = require('../views/modals/markdown-view');
        dialogRegion.show(new MarkdownView({}));
      });
    },

    keys: function() {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/modals/keyboard-view'], function(require) {
        var KeyboardView = require('../views/modals/keyboard-view');
        dialogRegion.show(new KeyboardView({}));
      });
    },

    add: function() {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/app/addPeopleView'], function(require) {
        var AddPeopleViewModal = require('../views/app/addPeopleView');
        dialogRegion.show(new AddPeopleViewModal({}));
      });
    },

    settings: function() {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/modals/room-settings-view'], function(require) {
        var RoomSettingsModal = require('../views/modals/room-settings-view');
        dialogRegion.show(new RoomSettingsModal({ model: context.troupe() }));
      });
    },

    permissions: function() {
      presentPermissionsDialog({
        dialogRegion: this.dialogRegion
      });
    },

    tags: function() {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/modals/edit-tags-view'], function(require) {
        var EditTagsView = require('../views/modals/edit-tags-view');
        dialogRegion.show(new EditTagsView({ roomId: context.troupe().get('id') }));
      });
    },

    integrations: function() {
      var dialogRegion = this.dialogRegion;

      if (context.isTroupeAdmin()) {
        require.ensure(['../views/modals/integration-settings-view'], function(require) {
          var IntegrationSettingsModal = require('../views/modals/integration-settings-view');

          dialogRegion.show(new IntegrationSettingsModal({}));
        });
      } else {
        window.location = '#';
      }
    },

    share: function() {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/modals/share-view'], function(require) {
        var shareView = require('../views/modals/share-view');

        dialogRegion.show(new shareView.Modal({}));
      });
    },

    delete: function() {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/modals/delete-room-view'], function(require) {
        var DeleteModal = require('../views/modals/delete-room-view');

        dialogRegion.show(new DeleteModal({}));
      });
    },

    'notification-defaults': function() {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/modals/notification-defaults-view'], function(require) {
        var NotificationDefaultsView = require('../views/modals/notification-defaults-view');

        dialogRegion.show(
          new NotificationDefaultsView({
            model: new Backbone.Model()
          })
        );
      });
    },

    'welcome-message': showWelcomeMessage
  };
}

module.exports = createRoutes;
