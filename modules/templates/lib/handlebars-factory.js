'use strict';

var Handlebars = require('handlebars');
var i18nFactory = require('gitter-web-i18n');
var hbsHelpers = require('./hbs-helpers');
var avatarImgSrcSetHbsHelper = require('gitter-web-avatars/shared/avatar-img-srcset-hbs-helper');

var defaultI18n = i18nFactory.get();

function i18nHelper() {
  var options = arguments[arguments.length - 1];
  var args = Array.prototype.slice.call(arguments, 0, -1);
  var i18n = options.data.root.i18n || defaultI18n;
  return i18n.__.apply(i18n, args);
}

function i18nNumberHelper() {
  var options = arguments[arguments.length - 1];
  var args = Array.prototype.slice.call(arguments, 0, -1);
  var i18n = options.data.root.i18n || defaultI18n;
  return i18n.__n.apply(i18n, args);
}

function create() {
  var handlebars = Handlebars.create();

  // TODO: add caching!
  handlebars.registerHelper('cdn', hbsHelpers.cdn);
  handlebars.registerHelper('pad', hbsHelpers.pad);
  handlebars.registerHelper('avatarSrcSet', avatarImgSrcSetHbsHelper);
  handlebars.registerHelper('sanitizeHref', hbsHelpers.sanitizeHref);
  // These helpers are different from what is used in other page rendered templates
  // which normally come from `i18n-2` in `server/web/middlewares/i18n.js` -> `I18n.registerMethods(res.locals, req);`
  handlebars.registerHelper('__', i18nHelper);
  handlebars.registerHelper('__n', i18nNumberHelper);

  return handlebars;
}

module.exports = {
  create: create
};
