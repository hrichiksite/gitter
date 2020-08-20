'use strict';

const debug = require('debug-proxy')('app:present-community-create-dialog');
const appEvents = require('../utils/appevents');

function presentCommunityCreateDialog() {
  debug('Starting');

  require.ensure(['../vue/create-community', '../vue/store/store-instance'], function(require) {
    debug('Dependencies loaded');
    const store = require('../vue/store/store-instance');
    const renderCreateCommunityView = require('../vue/create-community').default;

    // Create an element for our create community flow to render into
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div class="js-create-community-view-root"></div>'
    );

    const createCommunityViewRootEl = document.querySelector('.js-create-community-view-root');
    if (!createCommunityViewRootEl) {
      throw new Error('Root element does not exist in DOM for the create community flow');
    }

    store.dispatch('createCommunity/fetchInitial');
    const vm = renderCreateCommunityView(createCommunityViewRootEl, store);
    debug('Rendered', vm);
    appEvents.trigger('stats.event', 'present-create-community-flow');

    appEvents.once('destroy-create-community-view', () => {
      debug('destroy-create-community-view', vm);

      // Destroy the vue listeners, etc
      vm.$destroy();
      // Remove the element from the DOM
      vm.$el.parentNode.removeChild(vm.$el);

      // Change the URL back to `#`
      appEvents.trigger('route', '');
    });
  });
}

module.exports = presentCommunityCreateDialog;
