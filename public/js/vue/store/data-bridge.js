const appEvents = require('../../utils/appevents');
const context = require('gitter-web-client-context');

import troupeCollections from '../../collections/instances/troupes';

function setupDataBridge(store) {
  appEvents.on('dispatchVueAction', (actionName, ...args) => {
    store.dispatch(actionName, ...args);
  });

  troupeCollections.troupes.on('add change', newRoom => {
    store.dispatch('upsertRoom', Object.assign({}, newRoom.attributes));
  });

  if (context.inTroupeContext()) {
    const chatCollection = require('../../collections/instances/chats-cached');
    chatCollection.on('sync', () => {
      store.dispatch(
        'addMessages',
        chatCollection.models.map(m => Object.assign({}, m.attributes))
      );
    });

    chatCollection.on('add', message => {
      store.dispatch('addMessages', [Object.assign({}, message.attributes)]);
    });

    chatCollection.on('remove', message => {
      store.dispatch('removeMessage', Object.assign({}, message.attributes));
    });
  }
}

export default setupDataBridge;
