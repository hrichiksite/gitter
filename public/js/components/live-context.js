'use strict';

const debug = require('debug-proxy')('app:live-context');
const context = require('gitter-web-client-context');
const troupeCollections = require('../collections/instances/troupes');

module.exports = {
  syncRoom: function() {
    troupeCollections.troupes.on('add change', newRoom => {
      const currentTroupeId = context.getTroupeId();
      if (newRoom.id !== currentTroupeId) {
        debug(
          `Incoming add/change event: room ID(${newRoom.id}) does not match current \`context.getTroupeId()\`(${currentTroupeId})`
        );
        return;
      }

      debug('Updating context.troupe() with ', newRoom.attributes);
      context.troupe().set(newRoom.attributes);
    });

    troupeCollections.troupes.on('remove', newRoom => {
      const currentTroupeId = context.getTroupeId();
      if (newRoom.id !== currentTroupeId) {
        debug(
          `Incoming remove event: room ID(${newRoom.id}) does not match current \`context.getTroupeId()\`(${currentTroupeId})`
        );
        return;
      }

      const newAttributes = { roomMember: false };
      debug('Updating context.troupe() with ', newAttributes);
      context.troupe().set(newAttributes);
    });
  }
};
