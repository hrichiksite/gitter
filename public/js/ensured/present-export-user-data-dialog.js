'use strict';

const debug = require('debug-proxy')('app:present-export-user-data-dialog');
const appEvents = require('../utils/appevents');

function presentExportUserDataDialog() {
  debug('Starting');

  require.ensure(['../vue/export-user-data-dialog', '../vue/store/store-instance'], function(
    require
  ) {
    debug('Dependencies loaded');
    const store = require('../vue/store/store-instance');
    const renderExportUserDataView = require('../vue/export-user-data-dialog').default;

    // Create an element for our export user data view to render into
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div class="js-export-user-data-view-root"></div>'
    );

    const exportUserDataViewRootEl = document.querySelector('.js-export-user-data-view-root');
    if (!exportUserDataViewRootEl) {
      throw new Error('Root element does not exist in DOM for the export user data dialog');
    }

    const vm = renderExportUserDataView(exportUserDataViewRootEl, store);
    debug('Rendered', vm);
    appEvents.trigger('stats.event', 'present-export-user-data-view');

    appEvents.once('destroy-export-user-data-view', () => {
      debug('destroy-export-user-data-view', vm);

      // Destroy the vue listeners, etc
      vm.$destroy();
      // Remove the element from the DOM
      vm.$el.parentNode.removeChild(vm.$el);

      // Change the URL back to `#`
      appEvents.trigger('route', '');
    });
  });
}

module.exports = presentExportUserDataDialog;
