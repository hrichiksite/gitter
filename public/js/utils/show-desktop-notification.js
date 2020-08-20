'use strict';

var WindowNotification = window.Notification;
var cdn = require('gitter-web-cdn');

function showDesktopNotification(message, callback) {
  var title = message.title;
  var text = message.text;
  var icon = message.icon || cdn('images/icon-logo-red-64.png');

  var notification = new WindowNotification(title, { body: text, icon: icon });

  var timeout = setTimeout(function() {
    notification.onclick = null;
    notification.close();
  }, 10000);

  notification.onclick = function() {
    clearTimeout(timeout);
    notification.onclick = null;
    notification.close();
    window.focus();
    callback(message);
  };
}

module.exports = showDesktopNotification;
