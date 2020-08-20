'use strict';

const Promise = require('bluebird');
const env = require('gitter-web-env');
const nconf = env.config;
const stats = env.stats;
const express = require('express');
const StatusError = require('statuserror');
const identifyRoute = env.middlewares.identifyRoute;
const featureToggles = require('../web/middlewares/feature-toggles');
const ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
const preventClickjackingMiddleware = require('../web/middlewares/prevent-clickjacking');
const langs = require('langs');
const loginUtils = require('../web/login-utils');
const socialMetadataGenerator = require('./social-metadata-generator');
const fonts = require('../web/fonts');
const contextGenerator = require('../web/context-generator');
const generateAdminChatMessageReportSnapshot = require('./snapshots/admin-chat-message-report-snapshot');

const survivalMode = !!process.env.SURVIVAL_MODE || false;

/**
 * When Gitter hits a big news site, this setting disables
 * the embedded chats on the home page, which helps with
 * load
 */
var slashdotEffectSurvivalMode = survivalMode || !!process.env.SLASHDOT_EFFECT_SURVIVAL_MODE;

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get(
  nconf.get('web:homeurl'),
  identifyRoute('homepage'),
  preventClickjackingMiddleware,
  featureToggles,
  require('../web/middlewares/unawesome-browser'),
  function(req, res, next) {
    if (req.user && req.query.redirect !== 'no') {
      loginUtils.redirectUserToDefaultTroupe(req, res, next);
      return;
    }

    // Ｔhis is code of the translation we are able to provide (e.g. en, zh-TW)
    var locale = req.i18n.getLocale();
    var requested = req.headers['accept-language'] || '';
    requested = requested.split(';')[0] || '';
    requested = requested.split(/,\s*/)[0];
    requested = requested.toLowerCase();

    var requestLangCode, requestLangLocalName;
    // Ｗe compare the translation we provide with what user wants
    // if we can't provide translation, we get localized name of the language so we can show  "Want this in 中文 ?" message
    // "en" for "en-gb" is fine, so is "zh-tw" for "zh-tw"
    const translationRequired = locale !== requested && locale !== requested.split('-')[0];
    if (translationRequired) {
      var requestLang = langs.where('1', requested);
      if (requestLang) {
        requestLangCode = requestLang['1'];
        requestLangLocalName = requestLang.local;
      }
    }

    var translatedBy = req.i18n.__('Translated By');
    /* i18n doesn't like empty strings. Use a dash as a proxy */
    if (translatedBy === '-') translatedBy = '';

    // when the viewer is not logged in:
    res.render('homepage', {
      slashdotEffectSurvivalMode: slashdotEffectSurvivalMode,
      bootScriptName: 'homepage',
      cssFileName: 'styles/homepage.css',
      wordy: locale === 'ru',
      translationRequired: translationRequired,
      requestLangCode: requestLangCode,
      requestLangLocalName: requestLangLocalName,
      translated: translatedBy,
      fonts: fonts.getFonts(),
      hasCachedFonts: fonts.hasCachedFonts(req.cookies),
      socialMetadata: socialMetadataGenerator.getMetadata()
    });
  }
);

if (nconf.get('web:homeurl') !== '/') {
  router.get('/', identifyRoute('homepage-landing'), preventClickjackingMiddleware, function(
    req,
    res
  ) {
    if (req.user) {
      if (req.query.redirect === 'no') {
        res.relativeRedirect(nconf.get('web:homeurl') + '?redirect=no');
      } else {
        res.relativeRedirect(nconf.get('web:homeurl'));
      }
      return;
    }

    res.render('landing');
  });
}

router.get('/apps', identifyRoute('homepage-apps'), preventClickjackingMiddleware, function(
  req,
  res
) {
  res.render('apps', {
    homeUrl: nconf.get('web:homeurl')
  });
});

router.get(
  '/manifest.webmanifest',
  identifyRoute('web-app-manifest'),
  preventClickjackingMiddleware,
  function(req, res) {
    res.set('Content-Type', 'application/manifest+json');
    res.render('manifest-webmanifest');
  }
);

router.get('/robots.txt', identifyRoute('homepage-robots'), preventClickjackingMiddleware, function(
  req,
  res
) {
  res.set('Content-Type', 'text/text');
  res.render('robotstxt', {
    allowCrawling: nconf.get('sitemap:allowCrawling'),
    sitemap: nconf.get('sitemap:location')
  });
});

router.get('/humans.txt', identifyRoute('homepage-humans'), preventClickjackingMiddleware, function(
  req,
  res
) {
  res.set('Content-Type', 'text/text');
  res.render('humanstxt');
});

router.get(
  '/-/unawesome-browser',
  identifyRoute('homepage-unawesome-browser'),
  preventClickjackingMiddleware,
  function(req, res) {
    res.status(406 /* Not Acceptable */).render('unawesome-browser', {});
  }
);

router.get('/about/early-bird', identifyRoute('earlybird'), preventClickjackingMiddleware, function(
  req,
  res
) {
  res.relativeRedirect('/');
});

router.get(
  '/about/gitlab/mailing-list',
  ensureLoggedIn,
  identifyRoute('gitlab-mailing-list'),
  preventClickjackingMiddleware,
  function(req, res) {
    var user = req.user;

    stats.event('gitlab_ml_opt_in', {
      userId: user.id,
      username: user.username
    });

    res.render('gitlab-mailing-list');
  }
);

// old campaign that still gets some hits
router.get('/about/*', identifyRoute('homepage-about'), preventClickjackingMiddleware, function(
  req,
  res
) {
  res.redirect(nconf.get('web:homeurl'));
});

// This really doesn't seem like the right place for this?
// Does anyone know what this is for?
router.get('/_s/cdn/*', identifyRoute('homepage-cdn'), preventClickjackingMiddleware, function(
  req,
  res
) {
  res.redirect(req.path.replace('/_s/cdn', ''));
});

router.get(
  '/-/admin/chat-message-reports',
  identifyRoute('admin-chat-message-reports'),
  preventClickjackingMiddleware,
  function(req, res) {
    if (!req.user || !req.user.staff) {
      throw new StatusError(403, 'Only staff can view this area');
    }

    Promise.props({
      troupeContext: contextGenerator.generateBasicContext(req),
      snapshots: generateAdminChatMessageReportSnapshot(req)
    }).then(function({ troupeContext, snapshots }) {
      troupeContext.snapshots = snapshots;

      res.render('admin/chat-message-reports', {
        bootScriptName: 'chat-message-reports',
        cssFileName: 'styles/router-admin-dashboard.css',
        troupeContext: troupeContext
      });
    });
  }
);

module.exports = router;
