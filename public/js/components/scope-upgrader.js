'use strict';

var Promise = require('bluebird');
var context = require('gitter-web-client-context');

/**
 * Perform a scope upgrade operation for a user
 */
function doScopeUpgrade(requiredScope) {
  return new Promise(function(resolve) {
    function oauthUpgradeAfterRoomCreationCallback(e) {
      var data = e.data;
      if (!data || data.type !== 'oauth_upgrade_complete') return;

      window.removeEventListener('message', oauthUpgradeAfterRoomCreationCallback, false);

      // Update the model
      context.user().set({ scopes: data.scopes });
      return resolve(data.scopes);
    }

    window.addEventListener('message', oauthUpgradeAfterRoomCreationCallback, false);
    window.open('/login/upgrade?scopes=' + requiredScope);
  });
}

module.exports = doScopeUpgrade;
