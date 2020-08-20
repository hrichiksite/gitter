'use strict';

var Backbone = require('backbone');

function createRoutes() {
  return {
    notifications: function() {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/modals/notification-settings-view'], function(require) {
        var NotificationSettingsView = require('../views/modals/notification-settings-view');
        dialogRegion.show(
          new NotificationSettingsView({
            model: new Backbone.Model()
          })
        );
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
    }
  };
}

module.exports = createRoutes;
