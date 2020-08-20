'use strict';

var clientEnv = require('gitter-client-env');
var Raven = require('raven-js');

function normalise(s) {
  return s.replace(/\/_s\/\w+\//, '/_s/l/');
}

var DEFAULTS = {
  username: null,
  captureUnhandledRejections: true
};

function ravenClientFactory(options) {
  var ravenUrl = clientEnv.ravenUrl;
  var opts = Object.assign({}, DEFAULTS, options);

  if (!ravenUrl) {
    // No raven in this environment
    return function() {};
  }

  Raven.config(ravenUrl, {
    release: clientEnv['version'],
    captureUnhandledRejections: opts.captureUnhandledRejections,
    // # we highly recommend restricting exceptions to a domain in order to filter out clutter
    // whitelistUrls: ['example.com/scripts/']
    dataCallback: function(data) {
      try {
        data.stacktrace.frames.forEach(function(frame) {
          if (frame.filename) {
            frame.filename = normalise(frame.filename);
          }
        });

        if (data.culprit) {
          data.culprit = normalise(data.culprit);
        }
      } catch (e) {
        /* */
      }

      return data;
    },
    // via https://docs.sentry.io/clients/javascript/tips/#decluttering-sentry
    ignoreErrors: [
      // Halley spam, see https://github.com/troupe/gitter-webapp/issues/1056
      'TransportError',
      'BayeuxError',
      // Elasticsearch, see https://gitlab.com/gitlab-org/gitter/webapp/issues/1950
      'NoConnections',
      // Random plugins/extensions
      'top.GLOBALS',
      // See: http://blog.errorception.com/2012/03/tale-of-unfindable-js-error. html
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'http://tt.epicplay.com',
      "Can't find variable: ZiteReader",
      'jigsaw is not defined',
      'ComboSearch is not defined',
      'http://loading.retry.widdit.com/',
      'atomicFindClose',
      // Facebook borked
      'fb_xd_fragment',
      // ISP "optimizing" proxy - `Cache-Control: no-transform` seems to
      // reduce this. (thanks @acdha)
      // See http://stackoverflow.com/questions/4113268
      'bmi_SafeAddOnload',
      'EBCallBackMessageReceived',
      // See http://toolbar.conduit.com/Developer/HtmlAndGadget/Methods/JSInjection.aspx
      'conduitPage'
    ],
    ignoreUrls: [
      // Facebook flakiness
      /graph\.facebook\.com/i,
      // Facebook blocked
      /connect\.facebook\.net\/en_US\/all\.js/i,
      // Woopra flakiness
      /eatdifferent\.com\.woopra-ns\.com/i,
      /static\.woopra\.com\/js\/woopra\.js/i,
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      // Other plugins
      /127\.0\.0\.1:4001\/isrunning/i, // Cacaoweb
      /webappstoolbarba\.texthelp\.com\//i,
      /metrics\.itunes\.apple\.com\.edgesuite\.net\//i
    ]
  }).install();

  Raven.setUserContext({
    username: opts.username
  });

  return function(err, extraData) {
    return Raven.captureException(err, extraData);
  };
}

module.exports = ravenClientFactory;
