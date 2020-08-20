'use strict';

var repoPremiumStatusNotifier = require('../../services/repo-premium-status-notifier');

/**
 * This is a simple notification webhook from billing.gitter.im to let us
 * know when a subscription has been created.
 *
 * This endpoint is not secured, so don't use it for anything important YET!
 */
module.exports = function(req, res, next) {
  return repoPremiumStatusNotifier(req.params.userOrOrg, true) // Is premium
    .then(function() {
      res.send('OK');
    })
    .catch(next);
};
