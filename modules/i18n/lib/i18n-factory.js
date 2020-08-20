'use strict';

var env = require('gitter-web-env');
var config = env.config;
var I18n = require('i18n-2');
var path = require('path');
var fs = require('fs');
var translations = require('gitter-web-translations');

var devMode = config.runtimeEnvironment === 'dev';

function getLocales(localeDir) {
  var files = fs.readdirSync(localeDir);
  /* EN must always appear first */
  return ['en'].concat(
    files
      .filter(function(file) {
        var fullName = path.join(localeDir, file);
        return fs.statSync(fullName).isFile() && path.extname(file) === '.json';
      })
      .map(function(file) {
        return path.basename(file, '.json');
      })
      .filter(function(lang) {
        return lang !== 'en';
      })
  );
}

var messagesPath = translations.getMessagesPath();
var messageLocales = getLocales(messagesPath);

var homepagePath = translations.getHomePagePath();
var homepageLocales = getLocales(homepagePath);

module.exports = {
  get: function(req) {
    return new I18n({
      locales: messageLocales,
      defaultLocale: 'en',
      devMode: devMode,
      directory: messagesPath,
      extension: '.json',
      request: req
    });
  },

  getLocales: function() {
    return messageLocales;
  },

  getHomePage: function(req) {
    return new I18n({
      locales: homepageLocales,
      defaultLocale: 'en',
      devMode: devMode,
      directory: homepagePath,
      extension: '.json',
      request: req
    });
  }
};
