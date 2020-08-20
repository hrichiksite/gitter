'use strict';

const presentCreateRoomDialog = require('../ensured/present-create-room-dialog');
const presentCreateCommunityDialog = require('../ensured/present-create-community-dialog');
const presentExportUserDataDialog = require('../ensured/present-export-user-data-dialog');

function createRoutes() {
  return {
    'createroom(/:name)': function(initialRoomName) {
      presentCreateRoomDialog({
        initialRoomName: initialRoomName
      });
    },

    createcommunity: function() {
      presentCreateCommunityDialog();
    },

    'export-user-data': function() {
      presentExportUserDataDialog();
    }
  };
}

module.exports = createRoutes;
