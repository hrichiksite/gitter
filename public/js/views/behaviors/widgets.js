/* eslint max-statements: ["error", 41] */
'use strict';

var _ = require('lodash');
var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');
var unsafeParseHtml = require('../../utils/unsafe-parse-html');

var cachedWidgets = {};

function register(widgets) {
  var keys = _.keys(widgets);
  _.each(keys, function(key) {
    var value = widgets[key];
    cachedWidgets[key] = value;
  });
}

function WidgetManager() {
  this._widgets = [];
}

WidgetManager.prototype.add = function(widget) {
  this._widgets.push(widget);
};

WidgetManager.prototype.destroy = function() {
  _.each(this._widgets, function(item) {
    item.destroy();
  });
  this._widgets = [];
};

// eslint-disable-next-line complexity
function render(template, data, view) {
  if (!template) {
    var pseudoSelectorString = '';
    if (view) {
      pseudoSelectorString += view.childViewContainer;
      if (view.$el.length > 0) {
        var viewEl = view.$el[0];
        if (viewEl.id) {
          pseudoSelectorString += '#' + viewEl.id;
        }
        if (viewEl.classList.length > 0) {
          pseudoSelectorString += '.' + Array.prototype.join(viewEl.classList, '.');
        }
      }
    }

    throw new Error(
      "Cannot render the template since it's false, null or undefined. For context, we tried to render into this element: " +
        pseudoSelectorString
    );
  }

  var templateFunc;
  if (typeof template === 'function') {
    templateFunc = template;
  } else {
    templateFunc = Marionette.TemplateCache.get(template);
  }

  var generatedText = templateFunc(data);

  var prerenderedViews = data.prerenderedViews;

  // No widgets? Just return the text
  if (!prerenderedViews) return generatedText;

  var dom = unsafeParseHtml(generatedText);
  var widgetManager = view.widgetManager;

  var widgetsRendered = dom.querySelectorAll('.widget');
  var widgetsRenderedLen = widgetsRendered.length;

  if (widgetsRenderedLen && !widgetManager) {
    // Create a region manager if one doesn't already exist
    widgetManager = new WidgetManager();
    view.widgetManager = widgetManager;
  }

  for (var i = 0; i < widgetsRenderedLen; i++) {
    var widgetEl = widgetsRendered[i];
    var id = widgetEl.getAttribute('data-widget-id');
    if (!id) continue;
    var attrs = prerenderedViews[id];
    if (!attrs) continue;

    widgetEl.removeAttribute('data-widget-id');

    var Widget = cachedWidgets[attrs.widgetName];
    var model = attrs.model;
    model.el = widgetEl; // Existing element
    model.template = false; // No template (attach)

    // Attach the widget to the prerendered content
    var widget = new Widget(model);
    widget.render();

    // Add the widget to the widget manager
    widgetManager.add(widget);
  }

  return dom;
}

function getPrerendered(widgetName, model, id) {
  var Widget = cachedWidgets[widgetName];
  return Widget.getPrerendered(model, id);
}

var Behavior = Marionette.Behavior.extend({
  initialize: function() {
    if (this.view.templateHelpers) throw new Error('Cannot use templateHelpers with Widgets');
    this.view.templateHelpers = function() {
      // TODO: add global template helpers
      return {
        _view: this,
        getPrerendered: getPrerendered
      };
    };
  },
  onDestroy: function() {
    if (this.view.widgetManager) {
      this.view.widgetManager.destroy();
      this.view.widgetManager = null;
    }
  }
});

// No simple way to do this...
Marionette.Renderer = {
  render: render
};

behaviourLookup.register('Widgets', Behavior);

module.exports = {
  register: register,
  Behavior: Behavior
};
