'use strict';

const debug = require('debug-proxy')('app:user-notifications');
var appEvents = require('../utils/appevents');
var urlParser = require('../utils/url-parser');
var sessionMutex = require('../utils/session-mutex');
var context = require('gitter-web-client-context');
var onReady = require('../utils/onready');
var showDesktopNotification = require('../utils/show-desktop-notification');

var linkHandler = require('./link-handler');
var WindowNotification = window.Notification;
var webkitNotifications = window.webkitNotifications;

/**
 * Returns "granted", "denied", "default" or undefined
 */
function getDesktopNotificationAccess() {
  if (!WindowNotification) return;

  // Notification.permission undefined in chrome 31 and earlier
  if (WindowNotification.permission) {
    return WindowNotification.permission;
  } else {
    switch (webkitNotifications.checkPermission()) {
      case 0:
        return 'granted';
      case 1:
        return 'default';
      case 2:
        return 'denied';
    }
  }
}

/**
 * Returns true if propagation should be cancelled
 */
function onNotificationMessageClicked(message) {
  if (message.click) {
    message.click();
    return true;
  }

  if (message.link) {
    var parsed = urlParser.parse(message.link);

    return linkHandler.routeLink(parsed, { appFrame: true });
  }

  return true;
}

function onUserNotification(message) {
  debug('onUserNotification', message);

  if (getDesktopNotificationAccess() !== 'granted') {
    // Show web notifications in each tab
    // Disabled inline notifications because they are sucky
    // webNotifications.show(message, onNotificationMessageClicked);
    return;
  }

  if (message.notificationKey) {
    sessionMutex(message.notificationKey).then(function(lockObtained) {
      if (lockObtained) {
        showDesktopNotification(message, onNotificationMessageClicked);
      }
    });
  } else {
    showDesktopNotification(message, onNotificationMessageClicked);
  }
}

function requestDesktopNotificationAccess() {
  if (!WindowNotification) return;
  if (getDesktopNotificationAccess() === 'granted') return;

  WindowNotification.requestPermission(function() {});
}

function initUserNotifications() {
  //subscribe to notifications
  appEvents.on('user_notification', onUserNotification);

  appEvents.on('ajaxError', function() {
    appEvents.trigger('user_notification', {
      notificationKey: 'ajax.error',
      title: 'Unable to communicate with Gitter',
      text: "We're having problems communicating with the server at the moment....",
      click: function() {
        try {
          window.parent.location.reload(true);
        } catch (e) {
          window.location.reload(true);
        }
      }
    });
  });

  onReady(function() {
    // We don't show any notifications if you aren't logged in
    // so we might as well not bother those people
    if (context.isLoggedIn()) {
      requestDesktopNotificationAccess();
    }
  });
}

module.exports = {
  initUserNotifications: initUserNotifications,
  requestAccess: requestDesktopNotificationAccess,
  isAccessDenied: function() {
    return getDesktopNotificationAccess() === 'denied';
  }
};
