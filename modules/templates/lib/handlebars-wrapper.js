'use strict';

var handlebarsFactory = require('./handlebars-factory');
var fs = require('fs');
var i18nFactory = require('gitter-web-i18n');
var _ = require('lodash');
var Promise = require('bluebird');

function HandlebarsWrapper() {
  this.handlebars = handlebarsFactory.create();
}

HandlebarsWrapper.prototype = {
  compile: function(sourceFileName) {
    return Promise.fromCallback(function(callback) {
      fs.readFile(sourceFileName, 'utf-8', callback);
    })
      .bind(this)
      .then(function(source) {
        var template = this.handlebars.compile(source);

        // Returns a templating function which supports i18n
        return function(options) {
          var i18n;
          if (options.i18n) {
            i18n = options.i18n;
          } else {
            i18n = i18nFactory.get();
            if (options.lang) i18n.setLocale(options.lang);
          }

          return template(_.extend({}, options, { i18n: i18n }));
        };
      });
  }
};

module.exports = HandlebarsWrapper;
