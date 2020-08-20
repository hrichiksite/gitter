'use strict';

var apiClient = require('../components/api-client');
var serviceWorkerDeregistation = require('gitter-web-service-worker/browser/deregistration');
var Promise = require('bluebird');
const appEvents = require('./appevents');

function navigate(href) {
  window.location.href = href;
}

function logout(forcedRedirect) {
  // Notify others, that they shouldn't redirect while we are trying to logout
  // There is not a `account.logout-stop` event because this should always be sucessful in redirecting
  appEvents.trigger('account.logout-start');

  return Promise.all([apiClient.web.post('/logout'), serviceWorkerDeregistation.uninstall()])
    .spread(function(response) {
      if (forcedRedirect) {
        navigate(forcedRedirect);
      } else if (response && response.redirect) {
        navigate(response.redirect);
      } else {
        navigate('/');
      }
    })
    .catch(function() {
      if (forcedRedirect) {
        navigate(forcedRedirect);
      } else {
        navigate('/');
      }
    });
}

module.exports = logout;
