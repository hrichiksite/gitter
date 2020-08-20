'use strict';

function createRoutes(/* options */) {
  return {
    'delete-account': function() {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/modals/delete-room-view'], function(require) {
        var DeleteModal = require('../views/modals/delete-account-view');

        dialogRegion.show(new DeleteModal({}));
      });
    }
  };
}

module.exports = createRoutes;
