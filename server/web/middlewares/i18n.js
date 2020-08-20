'use strict';

var env = require('gitter-web-env');
var errorReporter = env.errorReporter;
var config = env.config;
var I18n = require('i18n-2');
var i18nFactory = require('gitter-web-i18n');

var homepagePath = config.get('web:homeurl');

function getI18n(req) {
  if (req.path === homepagePath) {
    return i18nFactory.getHomePage(req);
  }

  return i18nFactory.get(req);
}
module.exports = function(req, res, next) {
  const i18n = (req.i18n = getI18n(req));
  const lang = (i18n && i18n.locale) || 'en';

  I18n.registerMethods(res.locals, req);
  // Wrap the i18n function so that when it fails,
  // the page is still rendered with some text even if it may be templated
  res.locals['__'] = function(...args) {
    try {
      return i18n.__(...args);
    } catch (err) {
      errorReporter(err, { lang }, { module: 'i18n-middleware' });
      return args[0];
    }
  };

  /*  Setup i18n */
  if (i18n && i18n.prefLocale) {
    req.i18n.setLocale(i18n.prefLocale);
  }
  i18n.setLocaleFromQuery(req);

  /* i18n stuff */
  res.locals.locale = i18n;
  res.locals.lang = lang;

  next();
};
