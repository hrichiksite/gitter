'use strict';

var scopeUpgrader = require('../components/scope-upgrader');

function createRouter() {
  return {
    'upgraderepoaccess(/:name)': function(returnLocation) {
      scopeUpgrader('repo').then(function() {
        window.location.href = '#' + (returnLocation || '');
      });
    }
  };
}

module.exports = createRouter;
