'use strict';

require('./utils/tracking');
var appEvents = require('./utils/appevents');

setTimeout(function() {
  document.getElementById('apps-panel').classList.add('visible');
}, 1000);

document.getElementById('osx-download').addEventListener('click', function() {
  appEvents.trigger('track-event', 'desktop_client_download', { downloadOs: 'osx' });
});

document.getElementById('windows-download').addEventListener('click', function() {
  appEvents.trigger('track-event', 'desktop_client_download', { downloadOs: 'windows' });
});

document.getElementById('linux32-download').addEventListener('click', function() {
  appEvents.trigger('track-event', 'desktop_client_download', { downloadOs: 'linux' });
});

document.getElementById('linux64-download').addEventListener('click', function() {
  appEvents.trigger('track-event', 'desktop_client_download', { downloadOs: 'linux' });
});
