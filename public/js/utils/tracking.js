'use strict';

var clientEnv = require('gitter-client-env');
var appEvents = require('./appevents');

var trackingId = clientEnv['googleTrackingId'];
var trackingDomain = clientEnv['googleTrackingDomain'] || 'gitter.im'; // Remove this default 23/10/2014;
var ga;

var secureCookies = document.location.protocol === 'https:';

if (trackingId) {
  /* eslint-disable */
  (function(i, s, o, g, r, a, m) {
    i['GoogleAnalyticsObject'] = r;
    (i[r] =
      i[r] ||
      function() {
        (i[r].q = i[r].q || []).push(arguments);
      }),
      (i[r].l = 1 * new Date());
    (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
    a.async = 1;
    a.src = g;
    m.parentNode.insertBefore(a, m);
  })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');
  /* eslint-enable */

  ga = window.ga;

  ga('create', trackingId, trackingDomain, {
    cookieFlags: secureCookies ? 'SameSite=None; Secure' : undefined
  });
  ga('set', 'anonymizeIp', true);
  ga('send', 'pageview');
}

function trackPageView(/*routeName*/) {
  var gs = window._gs;
  if (gs) {
    gs('track');
  }

  // Removing this for now as it's affecting our bounce rate
  // if(trackingId) {
  //   ga('send', 'event', 'route', routeName);
  // }
}

function trackError(message, file, line) {
  if (trackingId) {
    ga('send', 'event', 'error', message, file, line);
  }
}

appEvents.on('track', function(routeName) {
  trackPageView(routeName);
});

// appEvents.on('track-event', function(eventName, data) {
//
// });

trackPageView(window.location.pathname);

module.exports = {
  trackError: trackError
};
