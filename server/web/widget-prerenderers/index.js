'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var compileTemplate = require('../compile-web-template');
var safeTemplateWrapper = require('../safe-template-wrapper');

var widgetHelpers = ['avatar'].reduce(function(memo, v) {
  var widgetTemplate;
  var handlerConstructor = require('./' + v);
  var handler;

  if (handlerConstructor.length === 1) {
    widgetTemplate = compileTemplate('/js/views/widgets/tmpl/' + v);
    handler = handlerConstructor(widgetTemplate);
  } else {
    handler = handlerConstructor();
  }

  memo[v] = safeTemplateWrapper(handler);
  return memo;
}, {});

function getWidgetHandler(widget) {
  var helper = widgetHelpers[widget];
  if (!helper)
    helper = function() {
      winston.warn('Unknown helper ' + widget);
      return '';
    };
  return helper;
}

module.exports = exports = {
  widget: function(widget, params) {
    return getWidgetHandler(widget)(params);
  }
};
