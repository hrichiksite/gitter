'use strict';

const debug = require('debug-proxy')('app:present-room-create-dialog');
const appEvents = require('../utils/appevents');

function presentCreateRoomDialog({ initialRoomName }) {
  debug('Starting');

  require.ensure(['../vue/create-room', '../vue/store/store-instance'], function(require) {
    debug('Dependencies loaded');
    const store = require('../vue/store/store-instance');
    const renderCreateRoomView = require('../vue/create-room').default;

    // Create an element for our create room flow to render into
    document.body.insertAdjacentHTML('beforeend', '<div class="js-create-room-view-root"></div>');

    const createRoomViewRootEl = document.querySelector('.js-create-room-view-root');
    if (!createRoomViewRootEl) {
      throw new Error('Root element does not exist in DOM for the create room flow');
    }

    store.dispatch('createRoom/fetchInitial');
    store.dispatch('createRoom/setRoomName', initialRoomName);
    const vm = renderCreateRoomView(createRoomViewRootEl, store);
    debug('Rendered', vm);
    appEvents.trigger('stats.event', 'present-create-room-flow');

    appEvents.once('destroy-create-room-view', () => {
      debug('destroy-create-room-view', vm);

      // Destroy the vue listeners, etc
      vm.$destroy();
      // Remove the element from the DOM
      vm.$el.parentNode.removeChild(vm.$el);

      // Change the URL back to `#`
      appEvents.trigger('route', '');
    });
  });
}

module.exports = presentCreateRoomDialog;
