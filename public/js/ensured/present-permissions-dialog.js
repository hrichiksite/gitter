'use strict';

var context = require('gitter-web-client-context');

function presentPermissionsDialog(options) {
  var dialogRegion = options.dialogRegion;

  require.ensure(
    [
      '../models/permissions-view-model',
      '../views/modals/permissions-view',
      '../collections/groups'
    ],
    function(require) {
      var PermissionsModel = require('../models/permissions-view-model');
      var permissionsView = require('../views/modals/permissions-view');
      var groupModels = require('../collections/groups');

      var groupCollection = new groupModels.Collection([], { listen: false });
      // This is total overkill, since we only need a single group....
      groupCollection.fetch();

      var slimCurrentRoom = context.troupe();

      var modal = new permissionsView.Modal({
        model: new PermissionsModel(
          {
            entity: slimCurrentRoom
          },
          {
            groupCollection: groupCollection
          }
        )
      });

      dialogRegion.show(modal);
    }
  );
}

module.exports = presentPermissionsDialog;
